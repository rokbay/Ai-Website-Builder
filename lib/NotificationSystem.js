/**
 * Pub/Sub Notification System for cross-component event handling
 * Provides centralized event publishing and subscription management
 */

class NotificationSystem {
    constructor() {
        this.subscribers = new Map();
        this.eventHistory = [];
        this.MAX_HISTORY = 100;
    }

    /**
     * Subscribe to notifications
     * @param {string} eventType - Type of event to subscribe to
     * @param {Function} callback - Callback function to execute
     * @returns {Function} Unsubscribe function
     */
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }

        this.subscribers.get(eventType).push(callback);

        // Return unsubscribe function
        return () => {
            const list = this.subscribers.get(eventType);
            if (list) {
                this.subscribers.set(eventType, list.filter((cb) => cb !== callback));
            }
        };
    }

    /**
     * Publish a notification
     * @param {string} eventType - Type of event
     * @param {any} data - Data to pass to subscribers
     */
    publish(eventType, data = {}) {
        const event = {
            type: eventType,
            data,
            timestamp: new Date().toISOString(),
        };

        // Add to history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.MAX_HISTORY) {
            this.eventHistory.shift();
        }

        // Call all subscribers
        const eventSubscribers = this.subscribers.get(eventType);
        if (eventSubscribers) {
            eventSubscribers.forEach((callback) => {
                try {
                    callback(data, event);
                } catch (error) {
                    console.error(`Error in notification callback for ${eventType}:`, error);
                }
            });
        }

        // Also publish to 'all' subscribers
        const wildcardSubscribers = this.subscribers.get('*');
        if (wildcardSubscribers) {
            wildcardSubscribers.forEach((callback) => {
                try {
                    callback(event);
                } catch (error) {
                    console.error('Error in wildcard notification callback:', error);
                }
            });
        }
    }

    /**
     * Compatibility method for direct notificationSystem.notify() calls
     */
    notify(eventType, data) {
        this.publish(eventType, data);
    }

    /**
     * Get event history
     * @param {string} eventType - Optional: filter by event type
     * @returns {Array} Event history
     */
    getHistory(eventType = null) {
        if (eventType) {
            return this.eventHistory.filter((e) => e.type === eventType);
        }
        return this.eventHistory;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * Get all subscribers count
     */
    getSubscriberCount(eventType = null) {
        if (eventType) {
            return (this.subscribers.get(eventType) || []).length;
        }
        let total = 0;
        for (const list of this.subscribers.values()) {
            total += list.length;
        }
        return total;
    }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem();

// Implement Strict Singleton Rule
// Note: We freeze AFTER adding the notify method to the instance
Object.freeze(notificationSystem);

// Ensure global registration for IPC bridge
if (typeof window !== 'undefined') {
    window.notificationSystem = notificationSystem;
}

// Event types constants
export const EVENTS = {
    STATUS_UPDATE: 'status:update',
    CONNECTIVITY_CHECK: 'connectivity:check',
    CONNECTIVITY_SUCCESS: 'connectivity:success',
    CONNECTIVITY_FAILED: 'connectivity:failed',
    AI_STREAM_START: 'ai:stream_start',
    AI_STREAM_CHUNK: 'ai:stream_chunk',
    AI_STREAM_END: 'ai:stream_end',
    AI_LATENCY: 'ai:latency',
    PAYLOAD_METRICS: 'ai:payload_metrics',
    BRIDGE_MESSAGE: 'bridge:message',
    PROTOCOL_UPGRADE: 'protocol:upgrade',
    GENERIC_NOTIFICATION: 'generic:notification',

    // Redis Events
    REDIS_CONNECTED: 'redis:connected',
    REDIS_METRICS: 'redis:metrics',

    // Server Events
    SERVER_STARTING: 'server:starting',
    SERVER_READY: 'server:ready',
    SERVER_ERROR: 'server:error',
    SERVER_STOPPING: 'server:stopping',

    // Status/UI Events
    LOADING_START: 'loading:start',
    LOADING_END: 'loading:end',

    // Error Events
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred',

    // API Events
    API_REQUEST: 'api:request',
    API_RESPONSE: 'api:response',
    API_ERROR: 'api:error',
    AI_STREAM_CHUNK: 'ai:stream:chunk',
    AI_STREAM_COMPLETE: 'ai:stream:complete',
    AI_STREAM_ERROR: 'ai:stream:error',

    // Convex Events
    CONVEX_CONNECTED: 'convex:connected',
    CONVEX_DISCONNECTED: 'convex:disconnected',
};

// Export convenience functions for common operations
export const notify = {
    status: (message, severity = 'info') =>
        notificationSystem.publish(EVENTS.STATUS_UPDATE, { message, severity }),
    
    error: (message, error = null) =>
        notificationSystem.publish(EVENTS.ERROR_OCCURRED, { message, error }),
    
    warning: (message) =>
        notificationSystem.publish(EVENTS.WARNING_OCCURRED, { message }),
    
    connectivityCheck: (target) =>
        notificationSystem.publish(EVENTS.CONNECTIVITY_CHECK, { target }),
    
    connectivitySuccess: (target) =>
        notificationSystem.publish(EVENTS.CONNECTIVITY_SUCCESS, { target }),
    
    connectivityFailed: (target, reason) =>
        notificationSystem.publish(EVENTS.CONNECTIVITY_FAILED, { target, reason }),
    
    serverReady: (info) =>
        notificationSystem.publish(EVENTS.SERVER_READY, info),
    
    convexConnected: (info) =>
        notificationSystem.publish(EVENTS.CONVEX_CONNECTED, info),
    
    convexDisconnected: () =>
        notificationSystem.publish(EVENTS.CONVEX_DISCONNECTED, {}),

    redisConnected: (info) =>
        notificationSystem.publish(EVENTS.REDIS_CONNECTED, info),

    redisMetrics: (metrics) =>
        notificationSystem.publish(EVENTS.REDIS_METRICS, metrics),

    // Fallback for direct calls to notify(event, data)
    notify: (eventType, data) => notificationSystem.publish(eventType, data),
};
