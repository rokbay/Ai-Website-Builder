'use client';

import React, { useState, useEffect, useRef } from 'react';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import { Activity, Signal, Cpu, Terminal, ChevronUp, ChevronDown, Database, Trash2, Maximize2, X, Zap } from 'lucide-react';

export default function DiagnosticsHUD() {
    const [messages, setMessages] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [latency, setLatency] = useState(0);
    const [tokensPerSec, setTokensPerSec] = useState(0);
    const [provider, setProvider] = useState('cloud');
    const scrollRef = useRef(null);

    useEffect(() => {
        setIsMounted(true);
        const unsubLog = notificationSystem.subscribe(EVENTS.BRIDGE_MESSAGE, (data) => {
            setMessages(prev => [...prev.slice(-49), { ...data, id: Date.now(), time: new Date().toLocaleTimeString() }]);
        });

        const unsubLatency = notificationSystem.subscribe(EVENTS.AI_LATENCY, (data) => {
            setLatency(data.ms);
            setProvider(data.provider);
            if (data.tokensPerSec) setTokensPerSec(data.tokensPerSec);
        });

        return () => {
            unsubLog();
            unsubLatency();
        };
    }, []);

    useEffect(() => {
        if (isExpanded && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    if (!isMounted) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[200] flex flex-col items-start gap-3">
            {/* Expanded Console View */}
            {isExpanded && (
                <div className="w-[450px] bg-black/90 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden mb-2 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <Terminal className="h-4 w-4 text-blue-500" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">System_Diagnostic_Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setMessages([])}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-red-400"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    
                    <div 
                        ref={scrollRef}
                        className="h-[300px] overflow-y-auto p-5 space-y-2 custom-scrollbar font-mono"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Activity className="h-8 w-8 mb-2" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Logs...</span>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className="text-[10px] leading-relaxed flex gap-3 group">
                                    <span className="text-slate-700 shrink-0">[{msg.time}]</span>
                                    <span className={`break-all ${
                                        msg.message?.toLowerCase().includes('error') ? 'text-red-400' :
                                        msg.message?.toLowerCase().includes('success') ? 'text-emerald-400' :
                                        'text-slate-300'
                                    }`}>
                                        <span className="text-blue-500/50 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">›</span>
                                        {msg.message}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Persistence: Virtual_Cache_Active</span>
                        <div className="flex items-center gap-4">
                            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Buffer: {messages.length}/50</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main HUD Bar */}
            <div className="flex items-center gap-2">
                {/* Clickable Cache Icon */}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 group ${
                        isExpanded 
                            ? 'bg-blue-600 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)]' 
                            : 'bg-black/80 border-white/10 hover:border-blue-500/50 backdrop-blur-2xl'
                    }`}
                >
                    <div className="relative">
                        <Database className={`h-4 w-4 transition-transform duration-500 ${isExpanded ? 'text-white scale-110' : 'text-blue-500 group-hover:scale-110'}`} />
                        {!isExpanded && messages.length > 0 && (
                            <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-blue-400 rounded-full animate-ping" />
                        )}
                    </div>
                    <div className={`h-4 w-px ${isExpanded ? 'bg-white/20' : 'bg-white/5'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isExpanded ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>
                        {isExpanded ? 'Console_Linked' : 'Diagnostics_HUD'}
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronUp className="h-4 w-4 text-slate-600 group-hover:text-blue-500" />}
                </button>

                {/* Secondary Telemetry Strip */}
                {!isExpanded && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-black/80 border border-white/5 rounded-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                        <div className="flex items-center gap-3 px-2">
                            <Activity className="h-3.5 w-3.5 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Latency</span>
                                <span className="text-[10px] font-mono text-emerald-500 font-bold leading-none">{latency}ms</span>
                            </div>
                        </div>
                        <div className="h-6 w-px bg-white/5" />
                        <div className="flex items-center gap-3 px-2">
                            <Cpu className="h-3.5 w-3.5 text-purple-500" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Provider</span>
                                <span className="text-[10px] font-mono text-purple-500 font-bold leading-none uppercase">{provider}</span>
                            </div>
                        </div>
                        <div className="h-6 w-px bg-white/5" />
                        <div className="flex items-center gap-3 px-2">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Speed</span>
                                <span className="text-[10px] font-mono text-amber-500 font-bold leading-none uppercase">{tokensPerSec} t/s</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
