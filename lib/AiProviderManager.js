/**
 * AI Provider Manager
 * Routes requests to either local models (LM Studio) or cloud providers (Gemini/Convex)
 */

import { SYSTEM_PROMPTS } from '../prompts/system_prompts';
import { notificationSystem, EVENTS } from './NotificationSystem';
import { payloadProcessor } from './PayloadProcessorClient';

class AiProviderManager {
    constructor() {
        this.LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
    }

    async getResponse({ messages, model, workspaceId, streamAction, updateMessages }) {
        // THE THREAD RULE: Offload payload metrics calculation to worker thread
        const metrics = await payloadProcessor.processMetrics(messages);
        notificationSystem.publish(EVENTS.PAYLOAD_METRICS, metrics);

        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        const selectedModel = (settings.aiModel || model || 'gemini-2.0-flash').toLowerCase();

        if (selectedModel.includes('lmstudio') || selectedModel.includes('lm studio')) {
            return this.generateLocalResponse(messages, selectedModel, workspaceId, updateMessages);
        } else {
            return this.generateCloudResponse(messages, selectedModel, workspaceId, streamAction, updateMessages);
        }
    }

    async generateLocalResponse(messages, model, workspaceId, updateMessages) {
        notificationSystem.publish(EVENTS.STATUS_UPDATE, {
            message: 'Routing to LM Studio (Direct Browser Fetch)',
            severity: 'info'
        });

        const startTime = Date.now();

        try {
            // Prepare messages for LM Studio (standard OpenAI format)
            const chatHistory = [
                { role: 'system', content: SYSTEM_PROMPTS.CODE_GEN_PROMPT },
                ...messages.map(m => ({ role: m.role, content: m.content }))
            ];

            const response = await fetch(this.LM_STUDIO_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: await payloadProcessor.serializeJson({
                    model: 'local-model', // LM Studio usually ignores this and uses the loaded model
                    messages: chatHistory,
                    temperature: 0.7,
                    stream: false // For simplicity in Phase 1, but we could add streaming
                })
            });

            if (!response.ok) {
                throw new Error(`LM Studio error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            notificationSystem.publish(EVENTS.AI_LATENCY, {
                ms: Date.now() - startTime,
                provider: 'LM Studio'
            });

            const finalMessages = [...messages, { role: 'ai', content }];

            // Sync with Convex for persistence even if generation was local
            if (updateMessages && workspaceId) {
                await updateMessages({
                    workspaceId,
                    messages: finalMessages
                });
            }

            return { content, messages: finalMessages };

        } catch (error) {
            notificationSystem.publish(EVENTS.STATUS_UPDATE, {
                message: `LM Studio Fetch Failed: ${error.message}`,
                severity: 'error'
            });
            throw error;
        }
    }

    async generateCloudResponse(messages, model, workspaceId, streamAction, updateMessages) {
        const messageIndex = messages.length;
        const finalMessages = [...messages, { role: 'ai', content: '' }];

        // 1. Save placeholder to DB
        await updateMessages({
            messages: finalMessages,
            workspaceId
        });

        // 2. Trigger Convex Action
        await streamAction({
            workspaceId,
            prompt: messages[messages.length - 1].content,
            model: model || 'gemini-1.5-flash',
            messageIndex: messageIndex
        });

        return { streaming: true };
    }
}

export const aiProviderManager = new AiProviderManager();
