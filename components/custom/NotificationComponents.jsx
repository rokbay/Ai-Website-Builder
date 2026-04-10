'use client';

import { useEffect, useState } from 'react';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import { Info, AlertCircle, CheckCircle, Bell, X, Terminal } from 'lucide-react';

/**
 * Enhanced Notification Sidebar Component
 */
export const NotificationDisplay = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);

    useEffect(() => {
        const unsubAll = notificationSystem.subscribe('*', (event) => {
            // Ignore very high frequency events to keep log clean
            if (event.type === EVENTS.AI_STREAM_CHUNK) return;

            setNotifications((prev) => {
                const newNotification = {
                    id: `${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: event.type,
                    message: event.data?.message || event.type,
                    severity: event.data?.severity || 'info',
                    timestamp: event.timestamp || new Date().toISOString(),
                };
                
                const updated = [newNotification, ...prev];
                return updated.slice(0, 50); // Keep last 50
            });

            if (!isOpen) setHasNew(true);
        });

        return () => unsubAll();
    }, [isOpen]);

    const getIcon = (severity) => {
        switch (severity) {
            case 'error': return <AlertCircle className="h-4 w-4 text-red-400" />;
            case 'success': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
            case 'warning': return <AlertCircle className="h-4 w-4 text-amber-400" />;
            default: return <Info className="h-4 w-4 text-blue-400" />;
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'error': return 'border-red-500/20 bg-red-500/5';
            case 'success': return 'border-emerald-500/20 bg-emerald-500/5';
            case 'warning': return 'border-amber-500/20 bg-amber-500/5';
            default: return 'border-blue-500/20 bg-blue-500/5';
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setHasNew(false); }}
                className="fixed bottom-6 right-6 p-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl z-[200] hover:scale-110 transition-all group"
            >
                <Bell className={`h-5 w-5 ${hasNew ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'} transition-colors`} />
                {hasNew && (
                    <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-blue-500 rounded-full border-2 border-slate-900 animate-pulse" />
                )}
            </button>

            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-slate-950/80 backdrop-blur-3xl border-l border-white/5 z-[250] shadow-2xl transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                        <div className="flex items-center gap-3">
                            <Terminal className="h-4 w-4 text-blue-400" />
                            <h2 className="text-sm font-black text-white tracking-[0.2em] uppercase">System Log</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                                <Terminal className="h-12 w-12" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">No Events Recorded</span>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-3 rounded-xl border ${getSeverityStyles(notif.severity)} animate-in fade-in slide-in-from-right-4 duration-300`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">{getIcon(notif.severity)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                                    {notif.type.split(':').pop()}
                                                </span>
                                                <span className="text-[8px] font-mono opacity-30">
                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-300 leading-relaxed break-words uppercase">
                                                {notif.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-slate-900/20">
                        <button
                            onClick={() => setNotifications([])}
                            className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all"
                        >
                            Clear All Logs
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {connected ? connectionType : 'No Signal'}
            </span>
        </div>
    );
};
