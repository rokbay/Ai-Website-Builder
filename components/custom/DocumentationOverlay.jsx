'use client';

import React from 'react';
import { X, BookOpen, Cpu, Zap, Activity, Info, Command, Terminal, ChevronRight } from 'lucide-react';

export default function DocumentationOverlay({ isOpen, onClose }) {
    if (!isOpen) return null;

    const sections = [
        {
            title: "NEURAL_SYNTHESIS_PROTOCOL",
            icon: Cpu,
            content: "Spec-Driven Synthesis utilizes local-first neural compute. By defining high-fidelity blueprints in the Command Terminal, the Engine generates full-stack architectures in real-time.",
            status: "Spec_Verified"
        },
        {
            title: "BRIDGE_STRATEGY_TELEMETRY",
            icon: Activity,
            content: "The Bridge uses a parallel racing strategy (Promise.any) to lock onto the fastest available connection—HTTP, WebSocket, or Convex—ensuring zero-latency startup.",
            status: "Pipeline_Stable"
        },
        {
            title: "INTELLIGENCE_NODE_SWITCHING",
            icon: Zap,
            content: "Toggle between Local Nodes (Ollama/LM Studio) for private execution, or Cloud Nodes (Gemini) for high-performance scale. Automatic Cloud Fallback is active by default.",
            status: "Multi_Model_Sync"
        }
    ];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-black border border-white/5 rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-500">
                <div className="bg-mesh opacity-20 absolute inset-0 pointer-events-none" />
                
                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-5">
                            <div className="p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                                <BookOpen className="h-6 w-6 text-blue-500" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Engine_Documentation</h2>
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">User_Guide_v2.1_Elite</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                        >
                            <X className="h-5 w-5 text-slate-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-10 lg:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Command className="h-4 w-4 text-slate-700" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core_Intelligence</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter leading-none">Spec-Driven Architecture.</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                        The AI-Website-Builder is built on the <span className="text-blue-500">Spec Kit</span> framework—a methodology that emphasizes creating clear specifications before implementation to ensure zero-defect development.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Terminal className="h-4 w-4 text-slate-700" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shortcuts</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { k: "CMD+K", v: "Generate" },
                                            { k: "Shift+Enter", v: "Multi-line" },
                                            { k: "CMD+D", v: "Diagnostics" },
                                            { k: "ESC", v: "Exit Overlay" }
                                        ].map(item => (
                                            <div key={item.k} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-400 font-mono tracking-widest">{item.k}</span>
                                                <span className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest">{item.v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {sections.map((section) => (
                                    <div key={section.title} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-blue-500/20 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <section.icon className="h-4 w-4 text-blue-500" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{section.title}</span>
                                            </div>
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-black uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                                            {section.content}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <Info className="h-3 w-3 text-slate-800" />
                                            <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest">{section.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-6 border-t border-white/5 bg-black flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">Project_Deliverable_v2.1_Elite</span>
                        </div>
                        <button className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
                            Explore Advanced Specs <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
