import React from 'react';
import { Code, Sparkles } from 'lucide-react';

import { useRouter } from 'next/navigation';

function Header() {
    const router = useRouter();
    return (
        <header className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-[100]">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo and Title */}
                    <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="bg-gradient-to-tr from-blue-600 via-blue-500 to-purple-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform duration-300">
                            <Code className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tighter uppercase">
                                AI Website Builder
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Stats (Functional feel) */}
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Neural Load</span>
                            <div className="flex gap-1 mt-1">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className={`h-1 w-3 rounded-full ${i < 4 ? 'bg-blue-500' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/5" />
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Uptime</span>
                            <span className="text-xs font-mono text-blue-400 font-bold">99.998%</span>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center">
                        <div className="group flex items-center space-x-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl transition-all hover:bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <div className="relative">
                                <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
                                <div className="absolute inset-0 bg-blue-400/20 blur-lg rounded-full" />
                            </div>
                            <span className="text-xs font-black text-blue-100 uppercase tracking-widest">AI Ready</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;