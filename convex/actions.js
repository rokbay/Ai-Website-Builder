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
      let fullContent = "";
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
                if (isLocal) {
                    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        const parsed = JSON.parse(line.replace('data: ', ''));
                        fullContent += model.toLowerCase().includes('ollama') ? parsed.response : (parsed.choices[0]?.delta?.content || '');
                    } else if (!line.startsWith('data: ')) {
                        const parsed = JSON.parse(line);
                        fullContent += parsed.response || '';
                    }
                } else {
                    // Quick regex fallback for Gemini chunking
                    const match = line.match(/"text":\s*"([^"]+)"/);
                    if (match) {
                        // Simple unescape
                        fullContent += match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    }
                }
            } catch (e) {
                // Ignore partial JSON parse errors
            }
        }

        // Batch mutations every 150ms
        if (Date.now() - lastMutationTime > 150) {
            await ctx.runMutation(api.workspace.UpdateStreamingMessage, {
                workspaceId,
                messageIndex,
                content: fullContent
            });
            lastMutationTime = Date.now();
        }
      }

      const duration = Date.now() - startTime;

      // Final persistence with benchmarks
      await ctx.runMutation(api.workspace.UpdateStreamingMessage, {
        workspaceId,
        messageIndex,
        content: fullContent,
        benchmarks: { ttfb: ttfb || duration, duration }
      });

    } catch (error) {
      console.error("CONVEX_ACTION_ERROR:", error);
    } finally {
      await ctx.runMutation(api.workspace.SetStreamingStatus, { workspaceId, isStreaming: false });
    }
  },
});
