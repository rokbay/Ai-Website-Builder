/**
 * AI Provider Manager
 * Manages L1 (Redis/SSE) Streaming and L2 (Convex) Checkpoints
 */
import { notificationSystem, EVENTS } from './NotificationSystem';
import { payloadProcessor } from './PayloadProcessorClient';
import { redisManager } from './redisManager';

class AiProviderManager {
    constructor() {
        this.LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';
    }

    async getResponse({ messages, model, workspaceId, streamAction, updateMessages }) {
        const metrics = await payloadProcessor.processMetrics(messages);
        notificationSystem.publish(EVENTS.REDIS_METRICS, {
            batchSize: 'INIT',
            offset: metrics.byteSize,
            status: 'connected'
        });

        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        const selectedModel = (settings.aiModel || model || 'gemini-2.0-flash').toLowerCase();

        if (selectedModel.includes('lmstudio') || selectedModel.includes('lm studio')) {
            return this.generateLocalResponse(messages, selectedModel, workspaceId, updateMessages);
        } else {
            // Note: streamAction (Convex mutation) is passed but we now only rely on updateMessages for the L2 Checkpoint
            return this.generateCloudResponse(messages, selectedModel, workspaceId, updateMessages);
        }
    }

    async generateLocalResponse(messages, model, workspaceId, updateMessages) {
        notificationSystem.publish(EVENTS.STATUS_UPDATE, { message: 'Routing Local Stream...', severity: 'info' });

        const finalMessages = [...messages, { role: 'ai', content: '' }];
        if (updateMessages && workspaceId) {
            await updateMessages({ workspaceId, messages: finalMessages });
        }

        try {
            const response = await fetch(this.LM_STUDIO_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
                    stream: true 
                })
            });

            if (!response.body) throw new Error("No ReadableStream provided by local model");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            const streamId = workspaceId || Date.now().toString();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.includes('[DONE]')) continue;
                    if (line.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(line.replace('data: ', ''));
                            const token = parsed.choices[0]?.delta?.content || '';
                            if (token) {
                                fullContent += token;
                                await redisManager.append(`stream:${streamId}`, token);
                                notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { delta: token, full: fullContent });
                            }
                        } catch (e) { /* Ignore partial parse errors */ }
                    }
                }
            }

            await redisManager.flushBuffer(streamId);

            finalMessages[finalMessages.length - 1].content = fullContent;
            if (updateMessages && workspaceId) {
                await updateMessages({ workspaceId, messages: finalMessages });
            }

            notificationSystem.publish(EVENTS.AI_STREAM_COMPLETE, { final: fullContent });
            return { content: fullContent, messages: finalMessages };

        } catch (error) {
            notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message: `LM Studio Fetch Failed: ${error.message}` });
            throw error;
        }
    }

    async generateCloudResponse(messages, model, workspaceId, updateMessages) {
        notificationSystem.publish(EVENTS.STATUS_UPDATE, { message: 'Routing Cloud L1 Stream...', severity: 'info' });
        
        // 1. Instantly update local UI state with a placeholder
        const finalMessages = [...messages, { role: 'ai', content: '' }];
        if (updateMessages && workspaceId) {
            const firstUserMessage = messages.find(m => m.role === 'user')?.content || 'Untitled Project';
            const description = firstUserMessage.length > 50 ? firstUserMessage.substring(0, 50) + '...' : firstUserMessage;
            await updateMessages({ workspaceId, messages: finalMessages, description });
        }

        let fullContent = "";
        let totalBytes = 0;

        try {
            // 2. Fetch directly from the L1 Edge Route (bypassing Convex Action)
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    workspaceId,
                    config: { model: model || 'gemini-2.0-flash' }
                })
            });

            if (!response.body) throw new Error("API failed to provide SSE stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            notificationSystem.publish(EVENTS.REDIS_METRICS, { 
                batchSize: '0B', offset: 0, status: 'streaming' 
            });

            // 3. Consume the L1 Stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                const lines = chunkText.split('\n\n'); // SSE delimiter

                for (const line of lines) {
                    if (line.includes('[DONE]')) continue;
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            if (data.chunk) {
                                fullContent += data.chunk;
                                totalBytes += new TextEncoder().encode(data.chunk).length;
                                
                                // Fire high-frequency UI updates directly (bypassing React State)
                                notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { delta: data.chunk, full: fullContent });
                                notificationSystem.publish(EVENTS.REDIS_METRICS, { 
                                    batchSize: `${totalBytes}B`, 
                                    offset: totalBytes, 
                                    status: 'streaming' 
                                });
                            }
                        } catch (e) {
                            /* Ignore partial JSON chunks */
                        }
                    }
                }
            }

            // 4. The L2 Checkpoint: Stream finished, save entire output to Convex DB
            finalMessages[finalMessages.length - 1].content = fullContent;
            if (updateMessages && workspaceId) {
                await updateMessages({ workspaceId, messages: finalMessages });
            }

            notificationSystem.publish(EVENTS.REDIS_METRICS, { 
                batchSize: `${totalBytes}B`, offset: totalBytes, status: 'completed' 
            });
            notificationSystem.publish(EVENTS.AI_STREAM_COMPLETE, { final: fullContent });

            return { streaming: false, content: fullContent, messages: finalMessages };

        } catch (error) {
            notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message: `Cloud Stream Failed: ${error.message}` });
            notificationSystem.publish(EVENTS.REDIS_METRICS, { status: 'error' });
            throw error;
        }
    }
}

export const aiProviderManager = new AiProviderManager();