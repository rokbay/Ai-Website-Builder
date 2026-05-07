/**
 * Pub/Sub Notification System
 * HMR-Safe Singleton for Next.js environments
 */

class NotificationSystem {
    constructor() {
        this.subscribers = new Map();
        this.eventHistory = [];
        this.MAX_HISTORY = 100;
    }

    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }

        this.subscribers.get(eventType).push(callback);

        return () => {
            const list = this.subscribers.get(eventType);
            if (list) {
                this.subscribers.set(eventType, list.filter((cb) => cb !== callback));
            }
        };
    }

    publish(eventType, data = {}) {
        const event = {
            type: eventType,
            data,
            timestamp: new Date().toISOString(),
        };

        this.eventHistory.push(event);
        if (this.eventHistory.length > this.MAX_HISTORY) {
            this.eventHistory.shift();
        }

        const list = this.subscribers.get(eventType);
        if (list) {
            // Execute callbacks asynchronously to prevent blocking the main thread
            list.forEach(callback => setTimeout(() => callback(event), 0));
        }
    }

    getHistory() {
        return [...this.eventHistory];
    }
}

export const EVENTS = {
    STATUS_UPDATE: 'status:update',
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred',
    CONNECTIVITY_CHECK: 'connectivity:check',
    CONNECTIVITY_SUCCESS: 'connectivity:success',
    CONNECTIVITY_FAILED: 'connectivity:failed',
    SERVER_READY: 'server:ready',
    CONVEX_CONNECTED: 'convex:connected',
    CONVEX_DISCONNECTED: 'convex:disconnected',
    REDIS_CONNECTED: 'redis:connected',
    REDIS_METRICS: 'redis:metrics',
    AI_STREAM_CHUNK: 'ai:stream:chunk',
    AI_STREAM_COMPLETE: 'ai:stream:complete',
};

// Next.js HMR Singleton Pattern
const createSingleton = () => {
    if (typeof globalThis !== 'undefined') {
        if (!globalThis.__notificationSystem__) {
            globalThis.__notificationSystem__ = new NotificationSystem();
        }
        return globalThis.__notificationSystem__;
    }
    return new NotificationSystem(); // Fallback
};

export const notificationSystem = createSingleton();

export const notify = {
    status: (message, severity = 'info') => notificationSystem.publish(EVENTS.STATUS_UPDATE, { message, severity }),
    error: (message, error = null) => notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message, error }),
    warning: (message) => notificationSystem.publish(EVENTS.WARNING_OCCURRED, { message }),
    redisMetrics: (metrics) => notificationSystem.publish(EVENTS.REDIS_METRICS, metrics),
    streamChunk: (chunk) => notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { chunk }),
};