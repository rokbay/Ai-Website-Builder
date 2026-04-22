import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { ExtremePrompts } from "@/lib/ai/prompts";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";

export async function POST(req) {
    const { prompt, config } = await req.json();

    try {
        // Build the extreme system prompt
        const fullPrompt = ExtremePrompts.CODE_GEN_BASE(prompt);

        const providerInfo = await AIProviderFactory.getStream(fullPrompt, config);
        
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