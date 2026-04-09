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

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'error':
                return 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]';
            case 'warning':
                return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.1)]';
            case 'success':
                return 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]';
            default:
                return 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]';
        }
    };

    return (
        <div className="fixed bottom-8 right-8 space-y-3 max-w-xs z-[200] font-sans">
            {/* Current Status */}
            <div
                className={`p-4 rounded-2xl backdrop-blur-xl border ${getSeverityStyles(statusSeverity)} transition-all duration-500 transform hover:scale-105`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                        statusSeverity === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">System Status</div>
                </div>
                <div className="text-xs font-bold leading-tight uppercase tracking-tighter">{currentStatus}</div>
            </div>

            {/* Notification Queue */}
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`p-4 rounded-2xl backdrop-blur-xl border ${getSeverityStyles(notif.severity)} animate-in fade-in slide-in-from-right-4 duration-500 transform hover:scale-105`}
                >
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{notif.type}</div>
                    <div className="text-xs font-medium leading-relaxed">{notif.message}</div>
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
