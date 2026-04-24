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
      const isLocal = model.toLowerCase().includes('ollama') || model.toLowerCase().includes('lmstudio');
      
      const apiKey = process.env.GEMINI_API_KEY;
      const redisUrl = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      const streamId = `${workspaceId}-${messageIndex}`;
      const redisKey = `stream:${streamId}`;

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
      const localChunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (ttfb === null) {
            ttfb = Date.now() - startTime;
        }

        const chunk = decoder.decode(value, { stream: true });
        let extractedContent = "";
        
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                if (isLocal) {
                    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        const parsed = JSON.parse(line.replace('data: ', ''));
                        extractedContent += model.toLowerCase().includes('ollama') ? parsed.response : (parsed.choices[0]?.delta?.content || '');
                    } else if (!line.startsWith('data: ')) {
                        const parsed = JSON.parse(line);
                        extractedContent += parsed.response || '';
                    }
                } else {
                    const match = line.match(/"text":\s*"([^"]+)"/);
                    if (match) {
                        extractedContent += match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    }
                }
            } catch (e) {}
        }

        if (extractedContent) {
            localChunks.push(extractedContent);
            // Buffer to Redis using REST API (Persistent side-channel)
            if (redisUrl && redisToken) {
                fetch(`${redisUrl}/append/${redisKey}/${encodeURIComponent(extractedContent)}`, {
                    headers: { Authorization: `Bearer ${redisToken}` }
                }).catch(() => {}); // Fire and forget for speed, fallback is localChunks
            }
        }
      }

      const duration = Date.now() - startTime;

      // Final Synthesis: Flush from Redis (or local fallback) and update Convex exactly ONCE
      let fullContent = "";
      if (redisUrl && redisToken) {
          try {
              const getRes = await fetch(`${redisUrl}/get/${redisKey}`, {
                  headers: { Authorization: `Bearer ${redisToken}` }
              });
              const data = await getRes.json();
              fullContent = data.result || localChunks.join("");

              // Cleanup
              await fetch(`${redisUrl}/del/${redisKey}`, {
                  headers: { Authorization: `Bearer ${redisToken}` }
              });
          } catch (e) {
              fullContent = localChunks.join("");
          }
      } else {
          fullContent = localChunks.join("");
      }

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
