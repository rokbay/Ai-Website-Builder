import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
    const {prompt, config} = await req.json();
    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = config?.model || "gemini-flash-lite-latest";
        const model = genAI.getGenerativeModel({ model: modelName });

        // Apply user-defined AI configuration if provided
        const generationConfig = {
            temperature: config?.temperature ?? 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        };

        const chat = model.startChat({ generationConfig });
        const result = await chat.sendMessageStream(prompt);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullText = '';
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        fullText += chunkText;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({chunk: chunkText})}\n\n`));
                    }
                    // Send final complete response
                    try {
                        // Extract JSON from potential markdown code blocks if the AI includes them
                        let jsonString = fullText;
                        if (fullText.includes('```json')) {
                            jsonString = fullText.split('```json')[1].split('```')[0];
                        } else if (fullText.includes('```')) {
                            jsonString = fullText.split('```')[1].split('```')[0];
                        }

                        const parsedData = JSON.parse(jsonString.trim());

                        // Sanitize files object for duplicate keys and valid structure
                        if (parsedData.files) {
                            const sanitizedFiles = {};
                            Object.keys(parsedData.files).forEach(key => {
                                // Prevent duplicate-ish keys (e.g., 'App.js' and '/App.js')
                                const cleanKey = key.startsWith('/') ? key : '/' + key;
                                sanitizedFiles[cleanKey] = parsedData.files[key];
                            });
                            parsedData.files = sanitizedFiles;
                        }

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({final: parsedData, done: true})}\n\n`));
                    } catch (e) {
                        console.error('JSON Parse Error:', e, fullText);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: 'Invalid JSON response: ' + e.message, done: true})}\n\n`));
                    }
                    controller.close();
                } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: e.message || 'Code generation failed'})}\n\n`));
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
        return new Response(JSON.stringify({error: e.message || 'Code generation failed'}), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}