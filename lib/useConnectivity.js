'use client';

import { useEffect } from 'react';
import { connChecker } from '@/lib/ConnectivityChecker';
import { SessionConnectionBuilder, convexConnChecker } from '@/lib/ConvexConnectivity';
import { notify } from '@/lib/NotificationSystem';

/**
 * Initialize all connectivity checks and monitoring
 * Should be called once in the main app layout
 */
export const useInitializeConnectivity = () => {
    useEffect(() => {
        const initializeConnectivity = async () => {
            try {
                notify.status('Initializing sharded connectivity...', 'info');

                // Use the new Fluent Builder Pattern
                const builder = new SessionConnectionBuilder();
                const session = await builder
                    .withRedis()
                    .withLocalFallback(connChecker)
                    .build();

                if (session.isConnected) {
                    notify.status('High-performance session active', 'success');
                }

                // Maintain legacy health checks for now
                connChecker.startHealthChecks(30000);
                if (convexConnChecker.isInitialized()) {
                    convexConnChecker.startHealthChecks(60000);
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
    return {
        isConnected: convexConnChecker.isConnected,
        getDiagnostics: () => convexConnChecker.getDiagnostics(),
    };
};
