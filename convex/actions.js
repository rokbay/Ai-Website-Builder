import { v } from 'convex/values';
import { action } from './_generated/server';
import { api } from './_generated/api';

export const StreamAiAction = action({
  args: {
    workspaceId: v.id('workspace'),
    prompt: v.string(),
    model: v.string(),
    messageIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspaceId, prompt, model, messageIndex } = args;

    // 1. Initial Status Set
    await ctx.runMutation(api.workspace.SetStreamingStatus, { workspaceId, isStreaming: true });

    try {
      let buffer = []; // Array of Uint8Arrays
      const isLocal = model.toLowerCase().includes('ollama') || model.toLowerCase().includes('lmstudio');
      
      const apiKey = process.env.GEMINI_API_KEY;
      const endpoint = isLocal 
        ? (model.toLowerCase().includes('ollama') ? 'http://localhost:11434/api/generate' : 'http://localhost:1234/v1/chat/completions')
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`;

      const startTime = Date.now();
      let ttfb = null;

      // Perform Fetch (Server-Side)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLocal ? { model, prompt, stream: true } : {
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`AI_ACTION_FAILURE: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let lastMutationTime = Date.now();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (ttfb === null) {
            ttfb = Date.now() - startTime;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                let contentToAdd = "";
                if (isLocal) {
                    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        const parsed = JSON.parse(line.replace('data: ', ''));
                        contentToAdd = model.toLowerCase().includes('ollama') ? parsed.response : (parsed.choices[0]?.delta?.content || '');
                    } else if (!line.startsWith('data: ')) {
                        const parsed = JSON.parse(line);
                        contentToAdd = parsed.response || '';
                    }
                } else {
                    // Quick regex fallback for Gemini chunking
                    const match = line.match(/"text":\s*"([^"]+)"/);
                    if (match) {
                        // Simple unescape
                        contentToAdd = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    }
                }

                if (contentToAdd) {
                    buffer.push(new TextEncoder().encode(contentToAdd));
                }
            } catch (e) {
                // Ignore partial JSON parse errors
            }
        }

        // Batch mutations every 150ms
        if (Date.now() - lastMutationTime > 150) {
            const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const b of buffer) {
                combined.set(b, offset);
                offset += b.length;
            }
            const currentFullContent = new TextDecoder().decode(combined);

            await ctx.runMutation(api.workspace.UpdateStreamingMessage, {
                workspaceId,
                messageIndex,
                content: currentFullContent
            });
            lastMutationTime = Date.now();
        }
      }

      const duration = Date.now() - startTime;

      const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const b of buffer) {
          combined.set(b, offset);
          offset += b.length;
      }
      const finalFullContent = new TextDecoder().decode(combined);

      // Final persistence with benchmarks
      await ctx.runMutation(api.workspace.UpdateStreamingMessage, {
        workspaceId,
        messageIndex,
        content: finalFullContent,
        benchmarks: { ttfb: ttfb || duration, duration }
      });

    } catch (error) {
      console.error("CONVEX_ACTION_ERROR:", error);
    } finally {
      await ctx.runMutation(api.workspace.SetStreamingStatus, { workspaceId, isStreaming: false });
    }
  },
});
