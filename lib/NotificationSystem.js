/**
 * Pub/Sub Notification System for cross-component event handling
 * Provides centralized event publishing and subscription management
 */

class NotificationSystem {
    constructor() {
        this.subscribers = {};
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
        if (!this.subscribers[eventType]) {
            this.subscribers[eventType] = [];
        }

        this.subscribers[eventType].push(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers[eventType] = this.subscribers[eventType].filter(
                (cb) => cb !== callback
            );
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
        if (this.subscribers[eventType]) {
            this.subscribers[eventType].forEach((callback) => {
                try {
                    callback(data, event);
                } catch (error) {
                    console.error(`Error in notification callback for ${eventType}:`, error);
                }
            });
        }

        // Also publish to 'all' subscribers
        if (this.subscribers['*']) {
            this.subscribers['*'].forEach((callback) => {
                try {
                    callback(event);
                } catch (error) {
                    console.error('Error in wildcard notification callback:', error);
                }
            });
        }
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
            return (this.subscribers[eventType] || []).length;
        }
        return Object.values(this.subscribers).reduce((sum, arr) => sum + arr.length, 0);
    }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem();

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
    BRIDGE_MESSAGE: 'bridge:message',
    PROTOCOL_UPGRADE: 'protocol:upgrade',

    // Server Events
    SERVER_STARTING: 'server:starting',
    SERVER_READY: 'server:ready',
    SERVER_ERROR: 'server:error',
    SERVER_STOPPING: 'server:stopping',

    // Status/UI Events
    STATUS_UPDATE: 'status:update',
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
};
