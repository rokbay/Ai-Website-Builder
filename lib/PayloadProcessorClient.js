/**
 * Payload Processor Client
 * Interface for communicating with the PayloadProcessor worker thread
 */

import { notificationSystem, EVENTS } from './NotificationSystem';

class PayloadProcessorClient {
    constructor() {
        this.worker = null;
        this.callbacks = new Map();
        this.requestId = 0;

        if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
            this.init();
        }
    }

    init() {
        try {
            // Using a standard worker initialization that works in Next.js
            this.worker = new Worker(new URL('./workers/PayloadProcessor.js', import.meta.url));

            this.worker.onmessage = (event) => {
                const { id, type, result, error } = event.data;
                const callback = this.callbacks.get(id);

                if (callback) {
                    this.callbacks.delete(id);
                    if (type === 'ERROR') {
                        callback.reject(new Error(error));
                    } else {
                        callback.resolve(result);
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('PayloadProcessor Worker Error:', error);
            };
        } catch (e) {
            console.error('Failed to initialize PayloadProcessor Worker:', e);
        }
    }

    /**
     * Process metrics for a payload in the worker thread
     */
    async processMetrics(payload) {
        if (!this.worker) return this._fallbackProcessMetrics(payload);

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            this.callbacks.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'PROCESS_METRICS', payload, id });
        });
    }

    /**
     * Serialize JSON in the worker thread
     */
    async serializeJson(payload) {
        if (!this.worker) return JSON.stringify(payload);

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            this.callbacks.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'SERIALIZE_JSON', payload, id });
        });
    }

    /**
     * Fallback for when worker is not available
     */
    _fallbackProcessMetrics(payload) {
        const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const byteSize = new Blob([str]).size;
        const estimatedTokens = Math.ceil(str.length / 4);

        return {
            byteSize,
            estimatedTokens,
            timestamp: Date.now()
        };
    }
}

export const payloadProcessor = new PayloadProcessorClient();
