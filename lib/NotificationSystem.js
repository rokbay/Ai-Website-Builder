/**
 * Pub/Sub Notification System — lib/NotificationSystem.js
 * HMR-safe singleton for Next.js environments.
 * Note: this file is intentionally minimal and has no external dependencies to avoid any issues with circular imports or HMR in Next.js. It is consumed by various parts of the app, including the DiagnosticsHUD and connectivity checker.
 *
 * EVENTS object structure:
 * - Flat string keys for easy subscription and debugging.
 * three new BATCH_* event keys added to EVENTS. Everything else identical.
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
            // Async to avoid blocking the main thread during high-frequency streaming
            list.forEach(callback => setTimeout(() => callback(event), 0));
        }
    }

    getHistory() {
        return [...this.eventHistory];
    }
}

export const EVENTS = {
    // General
    STATUS_UPDATE:        'status:update',
    ERROR_OCCURRED:       'error:occurred',
    WARNING_OCCURRED:     'warning:occurred',

    // Connectivity
    CONNECTIVITY_CHECK:   'connectivity:check',
    CONNECTIVITY_SUCCESS: 'connectivity:success',
    CONNECTIVITY_FAILED:  'connectivity:failed',

    // Server / Convex
    SERVER_READY:         'server:ready',
    CONVEX_CONNECTED:     'convex:connected',
    CONVEX_DISCONNECTED:  'convex:disconnected',

    // Redis / telemetry (legacy flat shape — kept for DiagnosticsHUD backward compat)
    REDIS_CONNECTED:      'redis:connected',
    REDIS_METRICS:        'redis:metrics',

    // Batch lifecycle (new — consumed by DiagnosticsHUD)
    BATCH_START:          'batch:start',
    BATCH_FLUSH:          'batch:flush',
    BATCH_ERROR:          'batch:error',

    // AI stream
    AI_STREAM_CHUNK:      'ai:stream:chunk',
    AI_STREAM_COMPLETE:   'ai:stream:complete',
};

// HMR-safe singleton
const createSingleton = () => {
    if (typeof globalThis !== 'undefined') {
        if (!globalThis.__notificationSystem__) {
            globalThis.__notificationSystem__ = new NotificationSystem();
        }
        return globalThis.__notificationSystem__;
    }
    return new NotificationSystem();
};

export const notificationSystem = createSingleton();

export const notify = {
    status:      (message, severity = 'info') => notificationSystem.publish(EVENTS.STATUS_UPDATE, { message, severity }),
    error:       (message, error = null)       => notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message, error }),
    warning:     (message)                     => notificationSystem.publish(EVENTS.WARNING_OCCURRED, { message }),
    redisMetrics:(metrics)                     => notificationSystem.publish(EVENTS.REDIS_METRICS, metrics),
    streamChunk: (chunk)                       => notificationSystem.publish(EVENTS.AI_STREAM_CHUNK, { chunk }),

    // Connectivity helpers used by ConnectivityChecker.js
    connectivityCheck:   (msg)          => notificationSystem.publish(EVENTS.CONNECTIVITY_CHECK,   { message: msg }),
    connectivitySuccess: (strategyName) => notificationSystem.publish(EVENTS.CONNECTIVITY_SUCCESS, { strategy: strategyName }),
    connectivityFailed:  (name, reason) => notificationSystem.publish(EVENTS.CONNECTIVITY_FAILED,  { strategy: name, reason }),
};