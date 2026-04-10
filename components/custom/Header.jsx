import React, { useState } from 'react';
import { Code, Sparkles, Settings, Activity, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';

function Header() {
    const router = useRouter();

    return (
        <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-3xl sticky top-0 z-[100]">
            <div className="max-w-[1800px] mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section */}
                    <div
                        className="flex items-center gap-4 group cursor-pointer"
                        onClick={() => router.push('/')}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/40 transition-all" />
                            <div className="relative bg-gradient-to-br from-slate-900 to-black p-2 rounded-xl border border-white/10 shadow-2xl group-hover:border-blue-500/30 transition-all">
                                <Code className="h-5 w-5 text-blue-400" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black text-white tracking-[0.15em] uppercase leading-tight">
                                Bolt <span className="text-blue-500">Engine</span>
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Local Core v2.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation/Center Section */}
                    <div className="hidden lg:flex items-center gap-10">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-3 w-3 text-slate-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stream Pipeline</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 w-2.5 rounded-full ${i < 6 ? 'bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-800'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-4 w-px bg-white/5" />

                        <div className="flex items-center gap-3">
                            <Terminal className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider">BRIDGE_CONNECTED</span>
                        </div>
                    </div>

                    {/* Actions Section */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">AI Status: Idle</span>
                        </div>

                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                        >
                            <Settings className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;