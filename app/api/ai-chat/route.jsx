import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";

export async function POST(req) {
    const { prompt, config } = await req.json();

    try {
        const providerInfo = await AIProviderFactory.getStream(prompt, config);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullText = '';
                    const it = providerInfo.iterator();
                    
                    for await (const chunk of it) {
                        fullText += chunk;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                    }
                    
                    // Final response completion
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