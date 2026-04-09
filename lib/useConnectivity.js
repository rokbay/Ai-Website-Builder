'use client';

import { useEffect } from 'react';
import { connChecker } from '@/lib/ConnectivityChecker';
import { convexConnChecker } from '@/lib/ConvexConnectivity';
import { notify } from '@/lib/NotificationSystem';

/**
 * Initialize all connectivity checks and monitoring
 * Should be called once in the main app layout
 */
export const useInitializeConnectivity = () => {
    useEffect(() => {
        const initializeConnectivity = async () => {
            try {
                notify.status('Initializing connectivity checks...', 'info');

                // Test initial connection with all strategies
                const connResult = await connChecker.testConnection();

                if (connResult.success) {
                    // Start health checks
                    connChecker.startHealthChecks(30000); // Check every 30 seconds
                    notify.status('Connectivity monitoring active', 'success');
                } else {
                    notify.warning('Connection strategies exhausted, retrying...');
                }

                // Initialize Convex checks
                if (convexConnChecker.isInitialized()) {
                    const convexResult = await convexConnChecker.checkConnection();
                    if (convexResult) {
                        convexConnChecker.startHealthChecks(60000); // Check every 60 seconds
                    }
                } else {
                    notify.warning('Convex not configured - backend features may be limited');
                }
            } catch (error) {
                notify.error(`Failed to initialize connectivity: ${error.message}`);
            }
        };

        initializeConnectivity();

        // Cleanup on unmount
        return () => {
            connChecker.stopHealthChecks();
            convexConnChecker.stopHealthChecks();
        };
    }, []);
};

/**
 * Hook for making requests with automatic fallback strategies
 */
export const useConnectedRequest = () => {
    const makeRequest = async (endpoint, options = {}) => {
        try {
            const info = connChecker.getConnectionInfo();
            notify.status(`Requesting ${endpoint} via ${info.strategy}`, 'info');

            const response = await connChecker.makeRequest(endpoint, options);

            // Cache successful responses
            if (response.ok && options.method === 'GET') {
                // TODO: Cache response for offline use
            }

            return response;
        } catch (error) {
            notify.error(`Request failed: ${error.message}`);
            throw error;
        }
    };

    return { makeRequest, getConnectionInfo: connChecker.getConnectionInfo };
};

/**
 * Hook for Convex connectivity status
 */
export const useConvexStatus = () => {
    useEffect(() => {
        const diagnostics = convexConnChecker.getDiagnostics();
        if (!diagnostics.isConnected) {
            notify.warning('Convex backend disconnected');
        }
    }, []);

    return {
        isConnected: convexConnChecker.isConnected,
        getDiagnostics: () => convexConnChecker.getDiagnostics(),
    };
};
