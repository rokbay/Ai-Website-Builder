import { notificationSystem, EVENTS } from './NotificationSystem';
import { payloadProcessor } from './PayloadProcessorClient';
import { PROMPTS } from './ai/prompts';

const BATCH_TOKEN_COUNT  = 200;   // emit a BATCH_FLUSH every N tokens
const MAX_HISTORY_TURNS  = 6;     // max messages sent as context (3 user+ai pairs)

class AiProviderManager {
  constructor() {
    this.LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';
    this._abortController = null;
  }

  stopGeneration() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    notificationSystem.publish(EVENTS.AI_STREAM_COMPLETE, { final: '' });
    notificationSystem.publish(EVENTS.REDIS_METRICS, { batchSize: '0B', offset: 0, status: 'idle' });
  }

  // ─── Public entry point ────────────────────────────────────────────────────
  async getResponse({ messages, model, workspaceId, streamAction, updateMessages }) {
    await payloadProcessor.processMetrics(messages);

    notificationSystem.publish(EVENTS.REDIS_METRICS, { batchSize: 0, offset: 0, status: 'connected' });

    const settings      = JSON.parse(localStorage.getItem('app_settings') || '{}');
    const selectedModel = (settings.aiModel || model || 'gemini-2.0-flash').toLowerCase();

    if (selectedModel.includes('lmstudio') || selectedModel.includes('lm studio')) {
      return this._streamLocal(messages, selectedModel, workspaceId, updateMessages);
    }
    return this._streamCloud(messages, selectedModel, workspaceId, updateMessages);
  }

  // ─── Batch event helpers ───────────────────────────────────────────────────
  _emitBatchStart(batchId, totalBatches) {
    notificationSystem.publish(EVENTS.BATCH_START, { batchId, batchSize: BATCH_TOKEN_COUNT, totalBatches });
  }

  _emitBatchFlush(batchId, bytesInBatch, totalBatches) {
    notificationSystem.publish(EVENTS.BATCH_FLUSH, { batchId, bytesInBatch, totalBatches });
    // Keep legacy REDIS_METRICS path alive so DiagnosticsHUD shows progress
    // regardless of which version of the HUD is installed
    notificationSystem.publish(EVENTS.REDIS_METRICS, {
      batchSize: `${bytesInBatch}B`,
      offset: totalBatches,
      status: 'streaming',
    });
  }

  // ─── Stream consumer ───────────────────────────────────────────────────────
  // Shared by both local and cloud paths.
  // format: 'openai' for LM Studio, 'sse' for the cloud edge route.
  async _consumeStream(reader, decoder, format, onToken) {
    let fullContent  = '';
    let tokenCounter = 0;
    let bytesInBatch = 0;
    let batchId      = 0;
    let totalBatches = 0;

    this._emitBatchStart(batchId, totalBatches);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      // LM Studio uses '\n' between SSE lines; the cloud edge route uses '\n\n'
      const lines = chunkText.split(format === 'sse' ? '\n\n' : '\n').filter(l => l.trim());

      for (const line of lines) {
        if (line.includes('[DONE]')) continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const data  = JSON.parse(line.slice(6)); // strip 'data: '
          const token = format === 'openai'
            ? (data?.choices?.[0]?.delta?.content ?? null)
            : (data?.chunk ?? data?.delta ?? null);

          if (!token) continue;

          fullContent  += token;
          tokenCounter += 1;
          bytesInBatch += new TextEncoder().encode(token).length;

          onToken(token, fullContent);

          if (tokenCounter >= BATCH_TOKEN_COUNT) {
            totalBatches += 1;
            this._emitBatchFlush(batchId, bytesInBatch, totalBatches);
            tokenCounter = 0;
            bytesInBatch = 0;
            batchId     += 1;
            this._emitBatchStart(batchId, totalBatches);
          }
        } catch { /* partial JSON chunk — ignore */ }
      }
    }

    // Flush remainder
    if (tokenCounter > 0) {
      totalBatches += 1;
      this._emitBatchFlush(batchId, bytesInBatch, totalBatches);
    }

    return fullContent;
  }

  // ─── Local path (LM Studio) ────────────────────────────────────────────────
  async _streamLocal(messages, model, workspaceId, updateMessages) {
    notificationSystem.publish(EVENTS.STATUS_UPDATE, { message: 'Connecting to local model...', severity: 'info' });

    // Optimistic placeholder so the UI shows the AI bubble immediately
    const finalMessages = [...messages, { role: 'ai', content: '' }];
    if (updateMessages && workspaceId) {
      await updateMessages({ workspaceId, messages: finalMessages });
    }

    try {
      // _buildPayload: trims history, strips code from AI turns, prepends system prompt
      const payload = this._buildPayload(messages);

      this._abortController = new AbortController();
      const response = await fetch(this.LM_STUDIO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: payload, stream: true }),
        signal: this._abortController.signal,
      });

      if (!response.body) throw new Error('No ReadableStream from local model');

      const fullContent = await this._consumeStream(
        response.body.getReader(),
        new TextDecoder(),
        'openai',
        (token, full) => notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { delta: token, full })
      );

      notificationSystem.publish(EVENTS.AI_STREAM_COMPLETE, { final: fullContent });

      // L2 checkpoint: persist condensed AI reply (title + explanation only, no code)
      finalMessages[finalMessages.length - 1].content = this._extractChatContext(fullContent);
      if (updateMessages && workspaceId) {
        await updateMessages({ workspaceId, messages: finalMessages });
      }

      return { streaming: false, content: fullContent, messages: finalMessages };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Local model generation stopped by user.');
        return { streaming: false, aborted: true };
      }
      console.error('Local model failed:', error);
      throw new Error(`LM Studio connection failed — ensure the server is running on ${this.LM_STUDIO_URL}`);
    }
  }

  // ─── Cloud path (Gemini via /api/ai-chat edge route) ──────────────────────
  async _streamCloud(messages, model, workspaceId, updateMessages) {
    notificationSystem.publish(EVENTS.STATUS_UPDATE, { message: 'Starting cloud stream...', severity: 'info' });

    const finalMessages = [...messages, { role: 'ai', content: '' }];
    if (updateMessages && workspaceId) {
      const firstUser = messages.find(m => m.role === 'user')?.content || 'Untitled Project';
      const description = firstUser.length > 50 ? firstUser.slice(0, 50) + '...' : firstUser;
      await updateMessages({ workspaceId, messages: finalMessages, description });
    }

    try {
      // For the cloud route we send the trimmed conversation array only —
      // the edge route prepends the system prompt server-side.
      // We still trim + strip code from AI turns to save input tokens.
      const trimmedMessages = this._trimHistory(messages);

      this._abortController = new AbortController();
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: trimmedMessages,
          workspaceId,
          config: { model: model || 'gemini-2.0-flash' },
        }),
        signal: this._abortController.signal,
      });

      if (!response.body) throw new Error('API did not return an SSE stream');

      const fullContent = await this._consumeStream(
        response.body.getReader(),
        new TextDecoder(),
        'sse',
        (token, full) => notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { delta: token, full })
      );

      // L2 checkpoint
      finalMessages[finalMessages.length - 1].content = this._extractChatContext(fullContent);
      if (updateMessages && workspaceId) {
        await updateMessages({ workspaceId, messages: finalMessages });
      }

      notificationSystem.publish(EVENTS.AI_STREAM_COMPLETE, { final: fullContent });

      return { streaming: false, content: fullContent, messages: finalMessages };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Cloud model generation stopped by user.');
        return { streaming: false, aborted: true };
      }
      notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message: `Stream failed: ${error.message}` });
      throw error;
    }
  }

  // ─── Payload builders ──────────────────────────────────────────────────────

  /**
   * For LM Studio: prepend system prompt + trimmed/cleaned history.
   */
  _buildPayload(messages) {
    return [
      { role: 'system', content: PROMPTS.CODE_GEN.system },
      ...this._trimHistory(messages),
    ];
  }

  /**
   * Trim history to MAX_HISTORY_TURNS and condense AI turns.
   * AI messages stored in Convex are already condensed by _extractChatContext
   * (they are "**title**\n\nexplanation" strings, not raw JSON).
   * This guard handles the in-session case where the raw JSON hasn't been
   * replaced yet in the local React state.
   */
  _trimHistory(messages) {
    const trimmed = messages.length > MAX_HISTORY_TURNS
      ? messages.slice(-MAX_HISTORY_TURNS)
      : messages;

    return trimmed.map(m => {
      const role = m.role === 'ai' ? 'assistant' : m.role;
      let content = m.content || '';

      if (role === 'assistant' && content) {
        try {
          let jsonText = content;
          const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (fence) jsonText = fence[1];
          const parsed = JSON.parse(jsonText);
          if (parsed?.explanation || parsed?.projectTitle) {
            content = `[Generated: ${parsed.projectTitle || 'project'}] ${parsed.explanation || ''}`.trim();
          }
        } catch { /* already plain text — use as-is */ }
      }

      return { role, content };
    });
  }

  /**
   * Extract the human-readable summary from a raw model response.
   * Stored in Convex as the AI turn content — keeps history lean.
   */
  _extractChatContext(fullText) {
    try {
      let jsonText = fullText;
      const fence = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fence) jsonText = fence[1];

      const parsed = JSON.parse(jsonText);
      if (parsed?.explanation || parsed?.projectTitle) {
        return `**${parsed.projectTitle || 'Project generated'}**\n\n${parsed.explanation || ''}`;
      }
    } catch {
      const titleMatch       = fullText.match(/"projectTitle"\s*:\s*"([^"]*)/);
      const explanationMatch = fullText.match(/"explanation"\s*:\s*"([^"]*)/);
      if (titleMatch || explanationMatch) {
        let partial = '';
        if (titleMatch)       partial += `**${titleMatch[1]}**\n\n`;
        if (explanationMatch) partial += explanationMatch[1];
        return partial || 'Synthesizing project structure...';
      }
    }
    return fullText;
  }
}

export const aiProviderManager = new AiProviderManager();