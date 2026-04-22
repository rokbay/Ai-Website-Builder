import { GoogleGenerativeAI } from "@google/generative-ai";
import { notificationSystem, EVENTS } from "../NotificationSystem";

/**
 * Factory and Provider logic for switching between Cloud (Gemini)
 * and Local (Ollama/LM Studio) AI models.
 * Now includes resilient fallback logic.
 */
export class AIProviderFactory {
    static async getStream(prompt, config = {}) {
        const primaryProvider = config.provider || 'google';
        const startTime = Date.now();
        
        try {
            // Priority 1: Requested Provider
            console.log(`[AI_FACTORY] Attempting synthesis via: ${primaryProvider}`);
            return await this.attemptProvider(primaryProvider, prompt, config, startTime);
        } catch (error) {
            console.warn(`[AI_FACTORY] ${primaryProvider} failed: ${error.message}`);
            
            // Priority 2: Automatic Cloud Fallback (if local failed)
            if (primaryProvider.startsWith('local')) {
                console.log(`[AI_FACTORY] Initiating Cloud Fallback Strategy...`);
                notificationSystem.notify(EVENTS.GENERIC_NOTIFICATION, { 
                    message: `Local server offline. Falling back to Gemini Cloud...`, 
                    severity: 'warning' 
                });
                return await this.attemptProvider('google', prompt, config, startTime);
            }
            
            throw error; // If google also fails or was the primary, rethrow
        }
    }

    static async attemptProvider(provider, prompt, config, startTime) {
        let providerInfo;
        
        if (provider === 'google') {
            providerInfo = await this.getGoogleStream(prompt, config);
        } else if (provider === 'local-ollama') {
            providerInfo = await this.getLocalStream(prompt, config, 'http://localhost:11434/v1');
        } else if (provider === 'local-lmstudio') {
            providerInfo = await this.getLocalStream(prompt, config, 'http://localhost:1234/v1');
        } else {
            throw new Error(`Unsupported provider: ${provider}`);
        }

        // Emit latency event for Diagnostics HUD
        const latency = Date.now() - startTime;
        notificationSystem.notify(EVENTS.AI_LATENCY, { ms: latency, provider });
        
        return providerInfo;
    }

    static async getGoogleStream(prompt, config) {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Cloud API Key (NEXT_PUBLIC_GEMINI_API_KEY) was not found in environment.");
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: config.model || "gemini-flash-lite-latest" });

        const generationConfig = {
            temperature: config.temperature ?? 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        };

        const result = await model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });

        return {
            type: 'google',
            iterator: async function* () {
                for await (const chunk of result.stream) {
                    yield chunk.text();
                }
            }
        };
    }

    static async getLocalStream(prompt, config, baseUrl) {
        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.localModel || "llama3",
                    messages: [{ role: "user", content: prompt }],
                    temperature: config.temperature ?? 0.7,
                    stream: true,
                }),
            });

            if (!response.ok) throw new Error(`${baseUrl} returned ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            return {
                type: 'local',
                iterator: async function* () {
                    let unfinishedLine = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = unfinishedLine + decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        unfinishedLine = lines.pop();

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6).trim();
                                if (dataStr === '[DONE]') return;
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.choices?.[0]?.delta?.content) {
                                        yield data.choices[0].delta.content;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            };
        } catch (fetchError) {
            throw new Error(`Connection to ${baseUrl} failed. Is the local AI server running?`);
        }
    }
}
