import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { ExtremePrompts } from "@/lib/ai/prompts";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";

export async function POST(req) {
    const { prompt, config } = await req.json();

    try {
        const fullPrompt = ExtremePrompts.ENHANCE_BASE(prompt);
        const providerInfo = await AIProviderFactory.getStream(fullPrompt, config);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const it = providerInfo.iterator();
                    for await (const chunk of it) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                    }
                    controller.close();
                } catch (e) {
                    console.error("[ENHANCE_STREAM_ERROR]", e);
                    notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message || 'Enhance synthesis failed' })}\n\n`));
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
        console.error("[ENHANCE_POST_ERROR]", e);
        notificationSystem.notify(EVENTS.AI_STREAM_ERROR, { message: e.message });
        return new Response(JSON.stringify({ error: e.message || 'Enhance initiation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}