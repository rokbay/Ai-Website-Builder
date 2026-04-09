'use client';

import { useEffect, useState } from 'react';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';

/**
 * Notification Display Component
 * Shows status updates and notifications from the pub/sub system
 */
export const NotificationDisplay = () => {
    const [notifications, setNotifications] = useState([]);
    const [currentStatus, setCurrentStatus] = useState('Initializing...');
    const [statusSeverity, setStatusSeverity] = useState('info');

    useEffect(() => {
        // Subscribe to status updates
        const unsubStatus = notificationSystem.subscribe(EVENTS.STATUS_UPDATE, (data) => {
            setCurrentStatus(data.message);
            setStatusSeverity(data.severity || 'info');
        });

        // Subscribe to all events for notification queue
        const unsubAll = notificationSystem.subscribe('*', (event) => {
            setNotifications((prev) => {
                const updated = [
                    ...prev,
                    {
                        id: `${event.type}-${event.timestamp}`,
                        type: event.type,
                        message: event.data?.message || event.type,
                        severity: event.data?.severity || 'info',
                        timestamp: event.timestamp,
                    },
                ];
                // Keep only last 10 notifications
                return updated.slice(-10);
            });
        });

        return () => {
            unsubStatus();
            unsubAll();
        };
    }, []);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'error':
                return 'bg-red-900 border-red-700 text-red-100';
            case 'warning':
                return 'bg-yellow-900 border-yellow-700 text-yellow-100';
            case 'success':
                return 'bg-green-900 border-green-700 text-green-100';
            default:
                return 'bg-blue-900 border-blue-700 text-blue-100';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 space-y-2 max-w-md z-50">
            {/* Current Status */}
            <div
                className={`p-3 rounded border ${getSeverityColor(statusSeverity)} text-sm`}
            >
                <div className="font-semibold">Status</div>
                <div className="text-xs opacity-90">{currentStatus}</div>
            </div>

            {/* Notification Queue */}
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`p-3 rounded border ${getSeverityColor(notif.severity)} text-sm`}
                >
                    <div className="font-semibold text-xs opacity-75">{notif.type}</div>
                    <div className="text-xs opacity-90">{notif.message}</div>
                </div>
            ))}
        </div>
    );
};

/**
 * Connection Status Indicator
 * Shows current connectivity status
 */
export const ConnectionIndicator = () => {
    const [connected, setConnected] = useState(false);
    const [connectionType, setConnectionType] = useState('offline');

    useEffect(() => {
        const unsubSuccess = notificationSystem.subscribe(EVENTS.CONNECTIVITY_SUCCESS, (data) => {
            setConnected(true);
            setConnectionType(data.target || 'connected');
        });

        const unsubFailed = notificationSystem.subscribe(EVENTS.CONNECTIVITY_FAILED, () => {
            setConnected(false);
        });

        return () => {
            unsubSuccess();
            unsubFailed();
        };
    }, []);

    return (
        <div className="flex items-center gap-2">
            <div
                className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                }`}
            />
            <span className="text-xs text-gray-400">
                {connected ? `Connected (${connectionType})` : 'Offline'}
            </span>
        </div>
    );
};
