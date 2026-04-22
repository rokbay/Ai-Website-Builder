'use client';

import React, { useState, useEffect } from 'react';
import { Code, Settings, Activity, Terminal, Cpu, Zap, Globe, Server, Info, ChevronDown, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { connChecker } from '@/lib/ConnectivityChecker';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import DocumentationOverlay from './DocumentationOverlay';

function Header() {
    const router = useRouter();
    const [connInfo, setConnInfo] = useState({ strategy: 'CHECKING', isConnected: false });
    const [aiModel, setAiModel] = useState('UNSET');
    const [showNodeDetails, setShowNodeDetails] = useState(false);
    const [showDocs, setShowDocs] = useState(false);

    useEffect(() => {
        setConnInfo(connChecker.getConnectionInfo());
        const saved = JSON.parse(localStorage.getItem('app_settings') || '{}');
        if (saved.aiModel) setAiModel(saved.aiModel);

        const unsub = notificationSystem.subscribe(EVENTS.CONNECTIVITY_SUCCESS, () => {
            setConnInfo(connChecker.getConnectionInfo());
        });

        const interval = setInterval(() => {
            const current = JSON.parse(localStorage.getItem('app_settings') || '{}');
            if (current.aiModel !== aiModel) setAiModel(current.aiModel || 'UNSET');
        }, 3000);

        return () => {
            unsub();
            clearInterval(interval);
        };
    }, [aiModel]);

    const isLocalNode = aiModel.toLowerCase().includes('ollama') || aiModel.toLowerCase().includes('lmstudio');

    return (
        <>
            <header className="border-b border-white/5 bg-black/95 backdrop-blur-3xl sticky top-0 z-[100] font-sans">
                <div className="max-w-[1800px] mx-auto px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Brand Section */}
                        <div
                            className="flex items-center gap-5 group cursor-pointer"
                            onClick={() => router.push('/')}
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full group-hover:bg-blue-600/30 transition-all duration-700" />
                                <div className="relative bg-black p-3 rounded-2xl border border-white/10 shadow-2xl group-hover:border-blue-500/40 transition-all duration-500">
                                    <Code className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-base font-black text-white tracking-[0.25em] uppercase leading-none mb-1.5">
                                    Bolt <span className="text-blue-500">Engine</span>
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">First of its Kind Synthesis</span>
                                </div>
                            </div>
                        </div>

                        {/* Elite Status & Telemetry */}
                        <div className="hidden xl:flex items-center gap-6 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                The World's First Real-Time Spec-Driven Synthesis Interface
                             </span>
                        </div>

                        <div className="hidden lg:flex items-center gap-12">
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl group-hover:border-blue-500/20 transition-all">
                                    <Activity className="h-4 w-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Bridge_Strategy</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-mono text-blue-400 font-black uppercase italic tracking-wider">
                                            {connInfo.strategy}
                                        </span>
                                        <div className={`h-1.5 w-1.5 rounded-full ${connInfo.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-white/5" />

                            <div className="relative">
                                <button 
                                    onClick={() => setShowNodeDetails(!showNodeDetails)}
                                    className="flex items-center gap-4 group cursor-pointer hover:bg-white/[0.02] p-2 rounded-2xl transition-all"
                                >
                                    <div className={`p-2.5 rounded-xl border transition-all duration-500 ${
                                        isLocalNode 
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:bg-amber-500/20' 
                                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500/20'
                                    }`}>
                                        {isLocalNode ? <Server className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                                    </div>
                                    <div className="flex flex-col items-start pr-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Intelligence_Node</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${isLocalNode ? 'text-amber-400' : 'text-indigo-400'}`}>
                                                {isLocalNode ? 'Local_Host' : 'Neural_Cloud'}
                                            </span>
                                            <ChevronDown className={`h-3 w-3 text-slate-700 transition-transform ${showNodeDetails ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </button>

                                {showNodeDetails && (
                                    <div className="absolute top-full left-0 mt-4 w-72 bg-black/95 border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl animate-in zoom-in-95 fade-in duration-300 z-50">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`p-3 rounded-2xl ${isLocalNode ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                {isLocalNode ? <Server className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Active Model</span>
                                                <span className="text-[11px] font-mono text-slate-400">{aiModel}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-600">
                                                <span>Latency</span>
                                                <span className="text-emerald-500">Pipeline Stable</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-600">
                                                <span>Security</span>
                                                <span className="text-blue-500">Spec_Verified</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-white/5">
                                            <p className="text-[8px] font-black text-slate-800 uppercase tracking-[0.3em] text-center">Neural_Node_v2.1_Deliverable</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-6 w-px bg-white/5" />

                            <div className="flex items-center gap-3">
                                <Terminal className="h-4 w-4 text-slate-700" />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
                                    {connInfo.isConnected ? 'PIPELINE_STABLE' : 'BRIDGE_WAITING'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-5">
                            <button 
                                onClick={() => setShowDocs(true)}
                                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/20 transition-all group"
                            >
                                <BookOpen className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Docs</span>
                            </button>

                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-blue-500/40 transition-all group"
                            >
                                <Settings className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <DocumentationOverlay isOpen={showDocs} onClose={() => setShowDocs(false)} />
        </>
    );
}

export default Header;