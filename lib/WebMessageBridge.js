/**
 * Direct WebMessage Interface (.NET ↔ Browser communication)
 * Uses PostMessage API instead of HTTP for local communication
 * This pattern is similar to how Blazor communicates with the browser
 */

class WebMessageBridge {
    constructor() {
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.handlers = new Map();
        this.messageTimeout = 30000; // 30 seconds

        // The Buffer Rule: Use Uint8Array for stream chunks
        this._chunkBuffer = []; // Array of Uint8Arrays
        this._bufferTimeout = null;

        this.setupMessageListener();
    }

    /**
     * Setup listener for messages from .NET
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            try {
                const message = event.data;

                // Check if this is a response to our request
                if (message.type === 'response' && message.id) {
                    const pending = this.pendingRequests.get(message.id);
                    if (pending) {
                        this.pendingRequests.delete(message.id);
                        clearTimeout(pending.timeout);

                        if (message.error) {
                            pending.reject(new Error(message.error));
                        } else {
                            pending.resolve(message.data);
                        }
                    }
                    return;
                }

                // Check if this is a broadcast message
                if (message.type === 'notification') {
                    this.handleNotification(message);
                    return;
                }

                // Check if this is a request that needs a handler
                if (message.type === 'request' && message.method) {
                    this.handleRequest(message);
                    return;
                }
            } catch (error) {
                console.error('Error processing message from .NET:', error);
            }
        });

        console.log('WebMessage bridge ready (Blazor-style IPC)');
    }

    /**
     * Send a request to .NET and wait for response
     */
    async request(method, data = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.messageId;

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`WebMessage request timeout: ${method}`));
            }, this.messageTimeout);

            this.pendingRequests.set(id, { resolve, reject, timeout, method });

            try {
                window.chrome.webview.postMessage({
                    type: 'request',
                    id,
                    method,
                    data,
                    timestamp: Date.now(),
                });
            } catch (error) {
                this.pendingRequests.delete(id);
                clearTimeout(timeout);
                reject(new Error(`WebMessage send failed: ${error.message}`));
            }
        });
    }

    /**
     * Register a handler for .NET requests
     */
    onRequest(method, handler) {
        this.handlers.set(method, handler);
    }

    /**
     * Handle incoming requests from .NET
     */
    async handleRequest(message) {
        try {
            const handler = this.handlers.get(message.method);

            if (!handler) {
                this.sendResponse(message.id, null, `No handler for method: ${message.method}`);
                return;
            }

            const result = await handler(message.data);
            this.sendResponse(message.id, result);
        } catch (error) {
            this.sendResponse(message.id, null, error.message);
        }
    }

    /**
     * Handle notification broadcasts from .NET
     */
    handleNotification(message) {
        if (!window.notificationSystem) {
            console.warn('NotificationSystem not loaded, queueing:', message.eventType);
            return;
        }

        // Implementation of 80ms buffering for AI stream chunks
        // THE BUFFER RULE: Use Uint8Array pooling instead of string +=
        if (message.eventType === 'ai:stream:chunk') {
            const chunkStr = message.data?.chunk || '';
            const chunkUint8 = new TextEncoder().encode(chunkStr);
            this._chunkBuffer.push(chunkUint8);

            if (!this._bufferTimeout) {
                this._bufferTimeout = setTimeout(() => {
                    // Combine all buffers
                    const totalLength = this._chunkBuffer.reduce((acc, curr) => acc + curr.length, 0);
                    const combined = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const buf of this._chunkBuffer) {
                        combined.set(buf, offset);
                        offset += buf.length;
                    }

                    // Convert back to string only for notification
                    const finalStr = new TextDecoder().decode(combined);
                    window.notificationSystem.publish('ai:stream:chunk', { chunk: finalStr });

                    this._chunkBuffer = [];
                    this._bufferTimeout = null;
                }, 80);
            }
            return;
        }

        window.notificationSystem.publish(message.eventType, message.data);
    }

    /**
     * Send response back to .NET
     */
    sendResponse(id, data, error = null) {
        try {
            window.chrome.webview.postMessage({
                type: 'response',
                id,
                data,
                error,
                timestamp: Date.now(),
            });
        } catch (err) {
            console.error('Failed to send WebMessage response:', err);
        }
    }

    /**
     * Check if WebMessage is available
     */
    static isAvailable() {
        return !!(window.chrome && window.chrome.webview && window.chrome.webview.postMessage);
    }

    /**
     * Get diagnostics
     */
    getDiagnostics() {
        return {
            available: WebMessageBridge.isAvailable(),
            pendingRequests: this.pendingRequests.size,
            handlers: Array.from(this.handlers.keys()),
            messagesSent: this.messageId,
        };
    }
}

// Export singleton instance
export const webMessageBridge = new WebMessageBridge();

// Make available globally for .NET interop
window.webMessageBridge = webMessageBridge;
