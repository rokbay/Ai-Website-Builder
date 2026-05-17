import { NextResponse } from 'next/server';
import Prompt from "@/data/Prompt";

// CRUCIAL: Forces Vercel/Next.js to run this on the Edge
export const runtime = 'edge';

export async function POST(req) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;
        const redisUrl = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;
        
        // Generate a fast stream ID on the edge
        const streamId = `enhance:${crypto.randomUUID()}`;

        // 1. Build the prompt with your enhancement rules
        const fullPrompt = `${Prompt.ENHANCE_PROMPT_RULES}\n\nOriginal prompt: ${prompt}`;

        // 2. Fetch directly from Gemini via REST (Edge-safe, clean SSE)
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error }, { status: response.status });
        }

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                const encoder = new TextEncoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || "";

                    for (const part of parts) {
                        const line = part.trim();
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.replace('data: ', '');
                                const parsed = JSON.parse(dataStr);
                                const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                                
                                if (textPart) {
                                    // Offload to Upstash Redis L1 Cache (Fire & Forget)
                                    if (redisUrl && redisToken) {
                                        fetch(`${redisUrl}/APPEND/${streamId}/${encodeURIComponent(textPart)}`, {
                                            headers: { Authorization: `Bearer ${redisToken}` }
                                        }).catch(() => {});
                                    }

                                    // Stream to Client UI
                                    const chunkData = JSON.stringify({ chunk: textPart });
                                    controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                                }
                            } catch (e) {
                                // Safely ignore partial chunks
                            }
                        }
                    }
                }
                
                // Set PLRU Eviction TTL to 10 minutes for enhance prompts (they are temporary)
                if (redisUrl && redisToken) {
                    fetch(`${redisUrl}/EXPIRE/${streamId}/600`, {
                        headers: { Authorization: `Bearer ${redisToken}` }
                    }).catch(() => {});
                }

                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Dummy Handlers for WPF Desktop Launcher Check
export async function GET() {
    return new Response(JSON.stringify({ status: "online" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}