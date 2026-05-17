/**
 * Direct WebMessage Interface (.NET ↔ Browser communication)
 */
import { notificationSystem, EVENTS } from './NotificationSystem';

class WebMessageBridge {
    constructor() {
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.handlers = new Map();
        this.messageTimeout = 30000;

        this._chunkBuffer = [];
        this._bufferTimeout = null;

        if (typeof window !== 'undefined') {
            this.setupMessageListener();
        }
    }

    setupMessageListener() {
        window.addEventListener('message', (event) => {
            try {
                const message = event.data;

                if (message.type === 'response' && message.id) {
                    const pending = this.pendingRequests.get(message.id);
                    if (pending) {
                        this.pendingRequests.delete(message.id);
                        clearTimeout(pending.timeout);
                        if (message.error) pending.reject(new Error(message.error));
                        else pending.resolve(message.data);
                    }
                    return;
                }

                if (message.eventType === 'ai:stream:chunk') {
                    const bytes = new Uint8Array(message.data.chunk);
                    this._chunkBuffer.push(bytes);

                    if (!this._bufferTimeout) {
                        this._bufferTimeout = setTimeout(() => {
                            const totalLength = this._chunkBuffer.reduce((acc, val) => acc + val.length, 0);
                            const combined = new Uint8Array(totalLength);
                            let offset = 0;
                            for (const arr of this._chunkBuffer) {
                                combined.set(arr, offset);
                                offset += arr.length;
                            }
                            
                            const finalStr = new TextDecoder().decode(combined);
                            notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { chunk: finalStr });

                            this._chunkBuffer = [];
                            this._bufferTimeout = null;
                        }, 80);
                    }
                    return;
                }

                if (message.eventType) {
                    notificationSystem.publish(message.eventType, message.data);
                }
            } catch (err) {
                console.error('WebMessage Processing Error:', err);
            }
        });
    }

    sendResponse(id, data, error = null) {
        try {
            if (window.chrome?.webview?.postMessage) {
                window.chrome.webview.postMessage({
                    type: 'response', id, data, error, timestamp: Date.now(),
                });
            }
        } catch (err) {
            console.error('Failed to send WebMessage response:', err);
        }
    }

    static isAvailable() {
        return typeof window !== 'undefined' && !!(window.chrome?.webview?.postMessage);
    }
}

export const webMessageBridge = new WebMessageBridge();