import { NextResponse } from 'next/server';

import { PROMPTS} from '@/lib/ai/prompts';

// CRUCIAL: Forces Vercel/Next.js to run this on the Edge, preventing 10s timeouts on long streams
export const runtime = 'edge';

export async function POST(req) {
    try {
        const { messages, prompt, config, workspaceId } = await req.json();
        const model = config?.model || 'gemini-2.0-flash';
        const apiKey = process.env.GEMINI_API_KEY;
        const redisUrl = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;

        let contents = [];
        if (messages && Array.isArray(messages)) {
            contents = messages.map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
        } else {
            contents = [{ role: 'user', parts: [{ text: prompt }] }];
        }

        // Force clean SSE from Gemini
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents,
                systemInstruction: {
                    role: "system",
                    parts: [{ text: PROMPTS.CODE_GEN.system }]
                }
            })
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
                
                // Initialize Redis Shard for this specific workspace chat
                const streamKey = `stream:${workspaceId || Date.now()}`;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || ""; // Keep incomplete chunk in buffer

                    for (const part of parts) {
                        const line = part.trim();
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.replace('data: ', '');
                                const parsed = JSON.parse(dataStr);
                                const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                                
                                if (textPart) {
                                    // 1. Offload to Upstash Redis (L1 Cache) asynchronously (Fire & Forget)
                                    if (redisUrl && redisToken) {
                                        fetch(`${redisUrl}/APPEND/${streamKey}/${encodeURIComponent(textPart)}`, {
                                            headers: { Authorization: `Bearer ${redisToken}` }
                                        }).catch(() => {}); 
                                        
                                        // Update PLRU Eviction TTL to 1 hour
                                        fetch(`${redisUrl}/EXPIRE/${streamKey}/3600`, {
                                            headers: { Authorization: `Bearer ${redisToken}` }
                                        }).catch(() => {});
                                    }

                                    // 2. Stream standard SSE to Client
                                    const chunkData = JSON.stringify({ chunk: textPart });
                                    controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                                }
                            } catch (e) {
                                // Safely ignore partial JSON chunks
                            }
                        }
                    }
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

// Keep your Dummy Handlers for the WPF Desktop Launcher
export async function GET() {
    return new Response(JSON.stringify({ status: "online", message: "API is reachable" }), {
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