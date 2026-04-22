"use client"
import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MessagesContext } from '@/context/MessagesContext';
import { Sparkles, ArrowRight, Plus, Clock, Zap, Wand2, Send, Loader2, Code2, Palette, Terminal, Layout, Cpu } from 'lucide-react';

export default function LaunchPanel() {
    const [userInput, setUserInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('create');
    const [recentWorkspaces, setRecentWorkspaces] = useState([]);

    const router = useRouter();
    const { setMessages } = useContext(MessagesContext);
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const DeleteWorkspace = useMutation(api.workspace.DeleteWorkspace);
    const convex = useConvex();

    useEffect(() => {
        const fetchRecent = async () => {
            const storedIds = JSON.parse(localStorage.getItem('recent_workspaces') || '[]');
            if (storedIds.length > 0) {
                const workspaces = await Promise.all(
                    storedIds.map(async (id) => {
                        try {
                            return await convex.query(api.workspace.GetWorkspace, {
                                workspaceId: id,
                                includeFileData: false,
                            });
                        } catch (e) {
                            return null;
                        }
                    })
                );
                setRecentWorkspaces(workspaces.filter(w => w !== null));
            }
        };
        fetchRecent();
    }, [convex]);

    const templates = [
        { id: 1, name: 'SaaS Platform', description: 'Complete landing page with pricing and features.', icon: '🚀', prompt: 'Create a modern SaaS landing page with pricing plans, features section, testimonials, and call-to-action' },
        { id: 2, name: 'AI Dashboard', description: 'Interactive data visualization and analytics.', icon: '📊', prompt: 'Create an interactive dashboard with charts, analytics, user metrics, and data visualization' },
        { id: 3, name: 'E-Commerce', description: 'Product grid with shopping cart integration.', icon: '🛍️', prompt: 'Create a modern e-commerce store with product listings, shopping cart, and checkout functionality' },
        { id: 4, name: 'Portfolio', description: 'Professional showcase for creative work.', icon: '🎨', prompt: 'Build a professional portfolio website with projects showcase, skills section, and contact form' }
    ];

    const clearLocalMemory = () => {
        localStorage.removeItem('recent_workspaces');
        setRecentWorkspaces([]);
    };

    const handleDeleteWorkspace = async (e, id) => {
        e.stopPropagation();
        await DeleteWorkspace({ workspaceId: id });
        const storedIds = JSON.parse(localStorage.getItem('recent_workspaces') || '[]');
        const updatedIds = storedIds.filter(storedId => storedId !== id);
        localStorage.setItem('recent_workspaces', JSON.stringify(updatedIds));
        setRecentWorkspaces(prev => prev.filter(ws => ws._id !== id));
    };

    const onGenerate = async (input) => {
        if (!input.trim()) return;
        setIsGenerating(true);
        try {
            const msg = { role: 'user', content: input }
            setMessages(msg);
            const workspaceID = await CreateWorkspace({
                messages: [msg],
                projectName: input.slice(0, 40) + (input.length > 40 ? '...' : '')
            });

            const storedIds = JSON.parse(localStorage.getItem('recent_workspaces') || '[]');
            const updatedIds = [workspaceID, ...storedIds.filter(id => id !== workspaceID)].slice(0, 10);
            localStorage.setItem('recent_workspaces', JSON.stringify(updatedIds));

            router.push('/workspace/' + workspaceID);
        } catch (error) {
            console.error('Error generating workspace:', error);
            setIsGenerating(false);
        }
    }

    const enhancePrompt = async () => {
        if (!userInput) return;
        setIsEnhancing(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhancedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) { enhancedText += data.chunk; setUserInput(enhancedText); }
                            if (data.done && data.enhancedPrompt) { setUserInput(data.enhancedPrompt); }
                        } catch (e) {}
                    }
                }
            }
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] relative bg-[#020617] bg-grid-pattern">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 lg:py-20">
                {/* Hero Header */}
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                        <Cpu className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Neural Engine v2.0 Live</span>
                    </div>
                    <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                        Design. Stream.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">Accelerate.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto tracking-tight">
                        The world's first local .NET accelerated web synthesizer. Low latency, high fidelity, infinite scale.
                    </p>
                </div>

                {/* Command Center */}
                <div className="max-w-4xl mx-auto mb-20">
                    <div className="holographic-card p-1">
                        <div className="bg-slate-950/60 rounded-[14px] p-6 lg:p-8 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <Terminal className="h-4 w-4 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Prompt Terminal</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                </div>
                            </div>

                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Describe the architectural vision for your next project..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-6 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/30 transition-all font-mono text-lg min-h-[140px] shadow-inner"
                            />

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={enhancePrompt}
                                    disabled={!userInput || isEnhancing}
                                    className="flex items-center justify-center gap-3 glass-button-secondary py-3.5"
                                >
                                    {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    <span className="text-[10px] uppercase tracking-[0.2em]">Optimize Logic</span>
                                </button>

                                <button
                                    onClick={() => onGenerate(userInput)}
                                    disabled={!userInput || isGenerating}
                                    className="flex-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3.5 font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span>Synthesize Project</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Navigation */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
                    {[
                        { id: 'create', icon: Layout, label: 'Architectures' },
                        { id: 'templates', icon: Sparkles, label: 'Blueprints' },
                        { id: 'recent', icon: Clock, label: 'Memory' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-all text-[10px] font-black uppercase tracking-[0.2em] ${
                                activeTab === tab.id
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'recent' && recentWorkspaces.length > 0 && (
                    <div className="flex justify-center mb-8 mt-4">
                        <button 
                            onClick={clearLocalMemory}
                            className="flex items-center gap-2 px-6 py-2 rounded-full border border-red-500/20 bg-red-500/10 text-[10px] font-black text-red-400 uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all"
                        >
                            Clear Local Memory
                        </button>
                    </div>
                )}

                {/* Dynamic Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'create' && (
                        <>
                            <div className="holographic-card p-8 group cursor-pointer" onClick={() => setActiveTab('templates')}>
                                <Layout className="h-10 w-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Library</h3>
                                <p className="text-sm text-slate-500 font-medium">Browse pre-validated architectural patterns and components.</p>
                            </div>
                            <div className="holographic-card p-8 group cursor-pointer" onClick={() => setActiveTab('recent')}>
                                <Clock className="h-10 w-10 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Recovery</h3>
                                <p className="text-sm text-slate-500 font-medium">Reconnect to active development streams and history.</p>
                            </div>
                            <div className="holographic-card p-8 group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}>
                                <Palette className="h-10 w-10 text-pink-400 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Calibration</h3>
                                <p className="text-sm text-slate-500 font-medium">Adjust engine parameters for high-precision generation.</p>
                            </div>
                        </>
                    )}

                    {activeTab === 'templates' && templates.map(t => (
                        <div key={t.id} onClick={() => onGenerate(t.prompt)} className="holographic-card p-6 group cursor-pointer border-transparent hover:border-blue-500/30">
                            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{t.icon}</div>
                            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">{t.name}</h3>
                            <p className="text-xs text-slate-500 font-medium mb-4">{t.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase">Core Blueprint</span>
                                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                            </div>
                        </div>
                    ))}

                    {activeTab === 'recent' && recentWorkspaces.map(ws => (
                        <div key={ws._id} onClick={() => router.push('/workspace/' + ws._id)} className="relative holographic-card p-6 group cursor-pointer">
                            <button 
                                onClick={(e) => handleDeleteWorkspace(e, ws._id)}
                                className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                title="Delete Workspace"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5">
                                    <Code2 className="h-5 w-5 text-indigo-400" />
                                </div>
                                <span className="text-[8px] font-mono text-slate-600">
                                    {new Date(ws._creationTime).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-white mb-2 truncate uppercase tracking-tighter group-hover:text-blue-400 transition-colors mr-8">
                                {ws.projectName || 'DECRYPTED_WORKSPACE'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium mb-6 italic truncate">
                                "{ws.messages?.[0]?.content}"
                            </p>
                            <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                Reconnect Stream <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                            {ws.benchmarks && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-slate-500">
                                    <span>TTFB: {ws.benchmarks.ttfb}ms</span>
                                    <span>GEN: {ws.benchmarks.duration}ms</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
