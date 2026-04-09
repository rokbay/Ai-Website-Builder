/**
 * Convex Repository Connectivity Checker
 * Tests and monitors connection to Convex backend services
 */

import { notificationSystem, EVENTS, notify } from './NotificationSystem';

class ConvexConnectivityChecker {
    constructor() {
        this.isConnected = false;
        this.lastCheckTime = null;
        this.retryCount = 0;
        this.MAX_RETRIES = 3;
        this.convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        this.healthCheckInterval = null;
    }

    /**
     * Check if Convex connection is available
     */
    async checkConnection() {
        if (!this.convexUrl) {
            const error = 'NEXT_PUBLIC_CONVEX_URL environment variable not set';
            notify.error(error);
            this.isConnected = false;
            return false;
        }

        try {
            notify.status('Checking Convex connectivity...', 'info');

            // Try to fetch Convex endpoint
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(this.convexUrl, {
                method: 'HEAD',
                signal: controller.signal,
            }).catch(async () => {
                // If HEAD fails, try a simple GET
                return fetch(this.convexUrl.replace(/\/$/, '') + '/version', {
                    method: 'GET',
                    signal: controller.signal,
                });
            });

            clearTimeout(timeout);

            this.isConnected = response.ok || response.status === 404; // 404 is fine, means server is up
            this.retryCount = 0;
            this.lastCheckTime = new Date();

            if (this.isConnected) {
                notify.status('Convex backend connected', 'success');
                notificationSystem.publish(EVENTS.CONVEX_CONNECTED, {
                    url: this.convexUrl,
                    timestamp: this.lastCheckTime,
                });
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (error) {
            this.retryCount++;
            const reason = error.message || 'Connection failed';
            notify.warning(`Convex connection failed: ${reason} (Retry ${this.retryCount}/${this.MAX_RETRIES})`);

            if (this.retryCount >= this.MAX_RETRIES) {
                this.isConnected = false;
                notify.error(`Convex backend unavailable after ${this.MAX_RETRIES} attempts`);
                notificationSystem.publish(EVENTS.CONVEX_DISCONNECTED, {
                    reason,
                    retries: this.retryCount,
                });
            }

            return false;
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks(interval = 30000) {
        // Check immediately
        this.checkConnection();

        // Then check periodically
        if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

        this.healthCheckInterval = setInterval(() => {
            this.checkConnection();
        }, interval);
    }

    /**
     * Stop health checks
     */
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Get diagnostics information
     */
    getDiagnostics() {
        return {
            isConnected: this.isConnected,
            convexUrl: this.convexUrl ? 'configured' : 'not-configured',
            lastCheckTime: this.lastCheckTime,
            retryCount: this.retryCount,
            maxRetries: this.MAX_RETRIES,
        };
    }

    /**
     * Test specific Convex function
     */
    async testFunction(functionName) {
        if (!this.isConnected) {
            notify.error(`Cannot test function: Convex not connected`);
            return false;
        }

        try {
            notify.status(`Testing Convex function: ${functionName}`, 'info');

            const response = await fetch(`${this.convexUrl}/api/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    function: functionName,
                }),
            });

            if (response.ok) {
                notify.status(`Function test passed: ${functionName}`, 'success');
                return true;
            }

            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            notify.error(`Function test failed: ${functionName} - ${error.message}`);
            return false;
        }
    }

    /**
     * Get connection URL
     */
    getConvexUrl() {
        return this.convexUrl;
    }

    /**
     * Check if Convex client is properly initialized
     */
    isInitialized() {
        return !!this.convexUrl && this.convexUrl.length > 0;
    }
}

// Export singleton instance
export const convexConnChecker = new ConvexConnectivityChecker();
