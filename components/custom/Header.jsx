import React from 'react';
import { Code, Sparkles } from 'lucide-react';

function Header() {
    return (
        <header className="border-b border-white/5 bg-gray-950/40 backdrop-blur-2xl sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo and Title */}
                    <div className="flex items-center space-x-4 group cursor-pointer">
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform duration-300">
                            <Code className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tighter uppercase">
                                AI Website Builder
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neural Link Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center">
                        <div className="group flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl transition-all hover:bg-white/10">
                            <div className="relative">
                                <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
                                <div className="absolute inset-0 bg-blue-400/20 blur-lg rounded-full" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-widest">AI Ready</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;