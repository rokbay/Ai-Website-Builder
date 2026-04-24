import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { ExtremePrompts } from "@/lib/ai/prompts";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";
import { redisManager } from "@/lib/redisManager";
import { payloadProcessor } from "@/lib/payloadProcessor";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
    const { prompt, config } = await req.json();
    const streamId = uuidv4();

    try {
        // Build the extreme system prompt
        const fullPrompt = ExtremePrompts.CODE_GEN_BASE(prompt);

        const providerInfo = await AIProviderFactory.getStream(fullPrompt, config);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const it = providerInfo.iterator();
                    
                    for await (const chunk of it) {
                        // The Buffer Rule: Append to Redis
                        await redisManager.appendToBuffer(streamId, chunk);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                    }
                    
                    // Final Synthesis: Flush from Redis
                    const fullText = await redisManager.flushBuffer(streamId);

                    // The Thread Rule: Offload metrics
                    payloadProcessor.processMetrics(fullText).catch(console.error);

                    // Final response completion
                    let finalJson = {};
                    try {
                        const jsonStr = fullText.match(/\{[\s\S]*\}/)?.[0] || fullText;
                        finalJson = JSON.parse(jsonStr);
                    } catch (e) {
                        console.warn("[API] Failed to parse final JSON, returning raw text.");
                        finalJson = { files: { "/App.js": { code: fullText } }, explanation: "Partial synthesis recovered." };
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ final: finalJson, done: true })}\n\n`));
                    controller.close();
                } catch (e) {
                    console.error("[API_STREAM_ERROR]", e);
                    notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message || 'Stream synthesis collapsed' })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch(e) {
        console.error("[API_POST_ERROR]", e);
        notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
        return new Response(JSON.stringify({ error: e.message || 'Synthesis workflow initiation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}