'use client';
import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react'; // Changed from Zap to avoid hallucination errors
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';

export function DiagnosticsHUD() {
    const [metrics, setMetrics] = useState({ batchSize: '0B', offset: 0, status: 'idle' });

    useEffect(() => {
        // Subscribe to real-time metrics
        const unsubscribe = notificationSystem.subscribe(EVENTS.REDIS_METRICS, (event) => {
            if (event.data) setMetrics(event.data);
        });

        return () => unsubscribe();
    }, []);

    // Format offset for UI (KB/MB)
    const formatOffset = (bytes) => {
        if (bytes === 0) return '0 KB';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-[#020617]/80 p-3.5 text-xs font-mono text-white shadow-2xl backdrop-blur-3xl transition-all duration-300">
            <div className="flex items-center gap-2 mb-1 border-b border-white/5 pb-2">
                <Activity className={`h-4 w-4 ${metrics.status === 'streaming' ? 'text-[#00f3ff] animate-pulse' : 'text-slate-500'}`} />
                <span className="font-semibold tracking-wider text-[10px] uppercase text-slate-300">Telemetry Link</span>
            </div>
            
            <div className="flex items-center justify-between gap-6 text-[11px]">
                <span className="text-slate-400">Stream Status:</span>
                <span className={metrics.status === 'streaming' ? 'text-[#00f3ff]' : 'text-slate-500'}>
                    {metrics.status.toUpperCase()}
                </span>
            </div>
            
            <div className="flex items-center justify-between gap-6 text-[11px]">
                <span className="text-slate-400">Batch Chunk:</span>
                <span className="text-white font-medium">{metrics.batchSize}</span>
            </div>
            
            <div className="flex items-center justify-between gap-6 text-[11px]">
                <span className="text-slate-400">Total Offset:</span>
                <span className="text-amber-400 font-bold">{formatOffset(metrics.offset)}</span>
            </div>
        </div>
    );
}