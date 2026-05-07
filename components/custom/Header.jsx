'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        else setAiModel('gemini-2.0-flash');

        const unsub = notificationSystem.subscribe(EVENTS.CONNECTIVITY_SUCCESS, () => {
            setConnInfo(connChecker.getConnectionInfo());
        });

        const interval = setInterval(() => {
            const current = JSON.parse(localStorage.getItem('app_settings') || '{}');
            if (current.aiModel !== aiModel) setAiModel(current.aiModel || 'gemini-2.0-flash');
        }, 3000);

        return () => {
            unsub();
            clearInterval(interval);
        };
    }, [aiModel]);

    const isLocalNode = aiModel.toLowerCase().includes('ollama') || aiModel.toLowerCase().includes('lmstudio');

    return (
        <>
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-[24px] sticky top-0 z-[100] font-sans border-b border-stone-200"
            >
                <div className="max-w-[1800px] mx-auto px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Brand Section */}
                        <div
                            className="flex items-center gap-3 group cursor-pointer"
                            onClick={() => router.push('/')}
                        >
                            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 transition-all duration-500">
                                <Code className="h-5 w-5 text-blue-600" />
                            </div>
                            <h1 className="text-sm font-black text-stone-800 tracking-[0.2em] uppercase leading-none">
                                Bolt <span className="text-blue-600">Engine</span>
                            </h1>
                        </div>

                        <div className="hidden lg:flex items-center gap-8">
                            <div className="flex items-center gap-3 group">
                                <Activity className="h-4 w-4 text-stone-400" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-wider italic">
                                        {connInfo.strategy}
                                    </span>
                                    <div className={`h-1 w-1 rounded-full ${connInfo.isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                                </div>
                            </div>

                            <div className="h-4 w-px bg-stone-200" />

                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-stone-400" />
                                <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest">
                                    {connInfo.isConnected ? 'Live' : 'Wait'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setShowDocs(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-all group"
                            >
                                <BookOpen className="h-4 w-4 text-stone-500" />
                                <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Docs</span>
                            </button>

                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                                className="p-2 rounded-xl bg-stone-50 border border-stone-200 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                            >
                                <Settings className="h-4 w-4 text-stone-500 group-hover:text-blue-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.header>
            <DocumentationOverlay isOpen={showDocs} onClose={() => setShowDocs(false)} />
        </>
    );
}

export default Header;