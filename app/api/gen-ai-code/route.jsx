import { AIProviderFactory } from "@/lib/ai/ProviderFactory";
import { PROMPTS } from "@/lib/ai/prompts";
import { notificationSystem, EVENTS } from "@/lib/NotificationSystem";

export async function POST(req) {
    const { prompt, config } = await req.json();

    try {
        // Build the system prompt
        const fullPrompt = `${PROMPTS.CODE_GEN.system}\n\nOriginal prompt: ${prompt}`;

        const providerInfo = await AIProviderFactory.getStream(fullPrompt, config);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let buffer = []; // Array of Uint8Arrays
                    const it = providerInfo.iterator();
                    
                    for await (const chunk of it) {
                        const uint8 = encoder.encode(chunk);
                        buffer.push(uint8);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                    }
                    
                    // Combine all chunks for final output
                    const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
                    const combined = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const b of buffer) {
                        combined.set(b, offset);
                        offset += b.length;
                    }
                    const fullText = new TextDecoder().decode(combined);

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