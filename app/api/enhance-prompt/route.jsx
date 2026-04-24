import { chatSession } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";
import { redisManager } from "@/lib/redisManager";
import { payloadProcessor } from "@/lib/payloadProcessor";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    const streamId = uuidv4();
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
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        // The Buffer Rule: No string +=
                        await redisManager.appendToBuffer(streamId, chunkText);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`));
                    }

                    // Final Synthesis: Flush from Redis
                    const fullText = await redisManager.flushBuffer(streamId);

                    // The Thread Rule: Offload metrics
                    payloadProcessor.processMetrics(fullText).catch(console.error);

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