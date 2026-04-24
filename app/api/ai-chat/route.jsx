import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";
import { redisManager } from "@/lib/redisManager";
import { payloadProcessor } from "@/lib/payloadProcessor";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
    const { prompt, config } = await req.json();
    const streamId = uuidv4();

    try {
        const providerInfo = await AIProviderFactory.getStream(prompt, config);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const it = providerInfo.iterator();
                    
                    for await (const chunk of it) {
                        // The Buffer Rule: Append to Redis buffer
                        await redisManager.appendToBuffer(streamId, chunk);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                    }
                    
                    // Final Synthesis: Flush from Redis
                    const fullText = await redisManager.flushBuffer(streamId);

                    // The Thread Rule: Offload metrics calculation
                    payloadProcessor.processMetrics(fullText).catch(console.error);

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result: fullText, done: true })}\n\n`));
                    controller.close();
                } catch (e) {
                    console.error("[CHAT_STREAM_ERROR]", e);
                    notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message || 'Chat synthesis failed' })}\n\n`));
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
        console.error("[CHAT_POST_ERROR]", e);
        notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
        return new Response(JSON.stringify({ error: e.message || 'Chat initiation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}