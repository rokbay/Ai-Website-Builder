/**
 * Connectivity Checker with Multiple Fallback Strategies
 * Implements pub/sub notifications and alternative localhost connection methods
 */

import { notificationSystem, EVENTS, notify } from './NotificationSystem';

class ConnectivityChecker {
    constructor() {
        this.strategies = [];
        this.currentStrategy = null;
        this.isConnected = false;
        this.checkInterval = null;
        this.HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
    }

    /**
     * Register a connection strategy
     */
    registerStrategy(strategy) {
        this.strategies.push(strategy);
    }

    /**
     * Test connectivity with parallel racing strategy
     * The first strategy to respond 'success' wins immediately
     */
    async testConnection() {
        notify.connectivityCheck('racing connection strategies');

        try {
            // Race all strategies in parallel. Promise.any returns the first successful one.
            const result = await Promise.any(
                this.strategies.map(async (strategy) => {
                    try {
                        const res = await strategy.test();
                        if (res.success) {
                            return { strategy, res };
                        }
                        throw new Error('Not successful');
                    } catch (e) {
                        notify.connectivityFailed(strategy.name, e.message);
                        throw e; // Promise.any will ignore this and wait for others
                    }
                })
            );

            this.currentStrategy = result.strategy;
            this.isConnected = true;
            notify.connectivitySuccess(result.strategy.name);
            notify.status(`Connected via ${result.strategy.name} (Parallel Lock)`, 'success');
            return result.res;

        } catch (error) {
            // All strategies failed
            this.isConnected = false;
            notify.connectivityFailed('all', 'All connection strategies exhausted');
            return { success: false, reason: 'No available connection strategy' };
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks(interval = this.HEALTH_CHECK_INTERVAL) {
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkInterval = setInterval(async () => {
            if (!this.isConnected) {
                await this.testConnection();
            }
        }, interval);
    }

    /**
     * Stop health checks
     */
    stopHealthChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Get current connection info
     */
    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            strategy: this.currentStrategy?.name || 'none',
            baseUrl: this.currentStrategy?.baseUrl || null,
        };
    }

    /**
     * Make a request using current strategy
     */
    async makeRequest(endpoint, options = {}) {
        if (!this.currentStrategy) {
            await this.testConnection();
        }

        if (!this.isConnected) {
            throw new Error('No active connection strategy');
        }

        return this.currentStrategy.request(endpoint, options);
    }
}

/**
 * HTTP Fetch Strategy for localhost Next.js server
 */
class LocalhostHttpStrategy {
    constructor(baseUrl = 'http://localhost:3000') {
        this.name = 'LocalhostHTTP';
        this.baseUrl = baseUrl;
        this.timeout = 5000;
    }

    async test() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}/`, {
                method: 'HEAD',
                signal: controller.signal,
            }).catch(() => {
                // If HEAD fails, try GET
                return fetch(`${this.baseUrl}/api/enhance-prompt`, {
                    method: 'GET',
                    signal: controller.signal,
                });
            });

            clearTimeout(timeoutId);

            return {
                success: response.ok || response.status === 405, // 405 = Method Not Allowed (POST-only)
                url: this.baseUrl,
            };
        } catch (error) {
            throw error;
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }
}

/**
 * WebSocket Strategy for real-time connection (future Convex integration)
 */
class WebSocketStrategy {
    constructor(baseUrl = 'ws://localhost:3000') {
        this.name = 'WebSocket';
        this.baseUrl = baseUrl;
        this.socket = null;
        this.timeout = 5000;
    }

    async test() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (this.socket) {
                    this.socket.close();
                }
                resolve({ success: false });
            }, this.timeout);

            this.socket = new WebSocket(this.baseUrl);

            this.socket.onopen = () => {
                clearTimeout(timeout);
                resolve({ success: true, url: this.baseUrl });
            };

            this.socket.onerror = () => {
                clearTimeout(timeout);
                resolve({ success: false });
            };
        });
    }

    async request(endpoint, options = {}) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            await this.test();
        }

        return new Promise((resolve, reject) => {
            const requestId = `${endpoint}-${Date.now()}`;
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket request timeout'));
            }, 10000);

            const onMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.requestId === requestId) {
                        clearTimeout(timeout);
                        this.socket.removeEventListener('message', onMessage);
                        resolve(data);
                    }
                } catch (e) {
                    // Ignore non-JSON messages
                }
            };

            this.socket.addEventListener('message', onMessage);
            this.socket.send(
                JSON.stringify({
                    requestId,
                    endpoint,
                    ...options,
                })
            );
        });
    }
}

/**
 * Convex Direct Strategy for backend connectivity
 */
class ConvexDirectStrategy {
    constructor(convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL) {
        this.name = 'ConvexDirect';
        this.baseUrl = convexUrl;
        this.timeout = 5000;
    }

    async test() {
        if (!this.baseUrl) {
            throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(this.baseUrl, {
                method: 'HEAD',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return {
                success: response.ok || response.status === 405,
                url: this.baseUrl,
            };
        } catch (error) {
            throw error;
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }
}

/**
 * Service Worker / Cache Strategy for offline support (future enhancement)
 */
class CacheStrategy {
    constructor() {
        this.name = 'Cache';
        this.cache = new Map();
    }

    async test() {
        // Cache is always available
        return { success: true, url: 'memory-cache' };
    }

    async request(endpoint, options = {}) {
        const cacheKey = `${endpoint}-${JSON.stringify(options.body || {})}`;

        if (options.method === 'GET' || !options.method) {
            // Try to return cached data
            if (this.cache.has(cacheKey)) {
                notify.status('Serving from cache (offline)', 'warning');
                return this.cache.get(cacheKey);
            }
        }

        throw new Error('No cached response available');
    }

    setCacheEntry(endpoint, options, response) {
        const cacheKey = `${endpoint}-${JSON.stringify(options.body || {})}`;
        this.cache.set(cacheKey, response);
    }
}

// Export singleton instance
export const connChecker = new ConnectivityChecker();

// Register default strategies
connChecker.registerStrategy(new LocalhostHttpStrategy());
connChecker.registerStrategy(new ConvexDirectStrategy());

// Only register WebSocket if NOT on the main dev port to avoid Next.js HMR conflict
if (typeof window !== 'undefined' && window.location.port !== '3000') {
    connChecker.registerStrategy(new WebSocketStrategy());
}

connChecker.registerStrategy(new CacheStrategy());

export { LocalhostHttpStrategy, ConvexDirectStrategy, WebSocketStrategy, CacheStrategy };
