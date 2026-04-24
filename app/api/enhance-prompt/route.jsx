import { chatSession } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";

export async function POST(request) {
    try {
        const { prompt } = await request.json();

        const result = await chatSession.sendMessageStream([
            Prompt.ENHANCE_PROMPT_RULES,
            `Original prompt: ${prompt}`
        ]);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let buffer = []; // Array of Uint8Arrays
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        const uint8 = encoder.encode(chunkText);
                        buffer.push(uint8);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`));
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

                    // Send final complete response
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ enhancedPrompt: fullText.trim(), done: true })}\n\n`));
                    controller.close();
                } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message, success: false })}\n\n`));
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
    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message,
            success: false
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 