"use client"
import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MessagesContext } from '@/context/MessagesContext';
import { Sparkles, ArrowRight, Plus, Clock, Settings, Zap, Wand2, Send, Loader2, Code2, Palette, X, Moon, Sun, Monitor, Cpu } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LaunchPanel() {
    const [userInput, setUserInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('create'); // 'create', 'templates', or 'recent'
    const [showSettings, setShowSettings] = useState(false);
    const [recentWorkspaces, setRecentWorkspaces] = useState([]);
    const { theme, setTheme } = useTheme();

    // Settings State
    const [settings, setSettingsState] = useState({
        aiModel: 'gemini-2.0-flash',
        temperature: 0.7,
        exportFormat: 'vite-react'
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem('app_settings');
        if (savedSettings) {
            setSettingsState(JSON.parse(savedSettings));
        }
    }, []);

    const updateSettings = (newSettings) => {
        const updated = { ...settings, ...newSettings };
        setSettingsState(updated);
        localStorage.setItem('app_settings', JSON.stringify(updated));
    };
    const router = useRouter();
    const { messages, setMessages } = useContext(MessagesContext);
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const convex = useConvex();

    // Fetch recent workspaces from localStorage and Convex
    useEffect(() => {
        const fetchRecent = async () => {
            const storedIds = JSON.parse(localStorage.getItem('recent_workspaces') || '[]');
            if (storedIds.length > 0) {
                const workspaces = await Promise.all(
                    storedIds.map(async (id) => {
                        try {
                            return await convex.query(api.workspace.GetWorkspace, { workspaceId: id });
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

    // Sample templates for quick launch
    const templates = [
        {
            id: 1,
            name: 'E-Commerce Store',
            description: 'Build a modern online store with products and checkout',
            icon: '🛍️',
            prompt: 'Create a modern e-commerce store with product listings, shopping cart, and checkout functionality'
        },
        {
            id: 2,
            name: 'Portfolio Website',
            description: 'Showcase your work with a professional portfolio',
            icon: '🎨',
            prompt: 'Build a professional portfolio website with projects showcase, skills section, and contact form'
        },
        {
            id: 3,
            name: 'SaaS Landing Page',
            description: 'Launch your startup with a beautiful landing page',
            icon: '🚀',
            prompt: 'Create a SaaS landing page with pricing plans, features section, testimonials, and call-to-action'
        },
        {
            id: 4,
            name: 'Blog Platform',
            description: 'Start a blog with posts and categories',
            icon: '📝',
            prompt: 'Build a blog platform with articles, categories, author pages, and search functionality'
        },
        {
            id: 5,
            name: 'Dashboard App',
            description: 'Data visualization and analytics dashboard',
            icon: '📊',
            prompt: 'Create an interactive dashboard with charts, analytics, user metrics, and data visualization'
        },
        {
            id: 6,
            name: 'Community Forum',
            description: 'Create a discussion and community space',
            icon: '💬',
            prompt: 'Build a community forum with threads, discussions, user profiles, and reputation system'
        }
    ];

    const onGenerate = async (input) => {
        if (!input.trim()) return;
        
        setIsGenerating(true);
        try {
            const msg = {
                role: 'user',
                content: input
            }
            setMessages(msg);
            const workspaceID = await CreateWorkspace({
                messages: [msg],
                name: input.slice(0, 40) + (input.length > 40 ? '...' : '')
            });

            // Store in localStorage for "Recent Projects"
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
                headers: {
                    'Content-Type': 'application/json',
                },
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
                            if (data.chunk) {
                                enhancedText += data.chunk;
                                setUserInput(enhancedText);
                            }
                            if (data.done && data.enhancedPrompt) {
                                setUserInput(data.enhancedPrompt);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleTemplateClick = (template) => {
        onGenerate(template.prompt);
    };

    const handleRecentClick = (workspaceId) => {
        router.push('/workspace/' + workspaceId);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate(userInput);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 relative overflow-hidden">
            {/* Holographic background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
            <div className="absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(circle_500px_at_50%_300px,#3b82f615,transparent)] blur-3xl" />
            <div className="absolute -left-20 top-1/4 h-[400px] w-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
            <div className="absolute -right-20 bottom-1/4 h-[400px] w-[400px] bg-blue-600/10 rounded-full blur-[120px]" />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Redundant header removed - using global header from provider */}

                {/* Floating Settings Button (Since header is global) */}
                <div className="fixed top-5 right-6 z-[110]">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest active:scale-95 shadow-2xl"
                    >
                        <Settings className="h-4 w-4 text-blue-400" />
                        Settings
                    </button>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-gray-800">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-blue-400" />
                                    Preferences
                                </h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Appearance */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Appearance</label>
                                    <div className="flex gap-2 p-1 bg-gray-950 rounded-xl border border-gray-800">
                                        {[
                                            { id: 'dark', icon: Moon, label: 'Dark' },
                                            { id: 'light', icon: Sun, label: 'Light' },
                                            { id: 'system', icon: Monitor, label: 'System' }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    theme === t.id
                                                        ? 'bg-blue-600 text-white shadow-lg'
                                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                                                }`}
                                            >
                                                <t.icon className="h-4 w-4" />
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Configuration */}
                                <div className="space-y-4 pt-2 border-t border-gray-800">
                                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Cpu className="h-4 w-4" /> AI Engine
                                    </label>

                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500">Model Selection</p>
                                        <select
                                            value={settings.aiModel}
                                            onChange={(e) => updateSettings({ aiModel: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Most Capable)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <p className="text-xs text-gray-500">Temperature (Creativity)</p>
                                            <span className="text-xs text-blue-400 font-mono">{settings.temperature}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={settings.temperature}
                                            onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-950/50 border-t border-gray-800">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="container mx-auto px-6 py-16 flex-1">
                    {/* Futuristic Hero Section */}
                    <div className="text-center space-y-10 mb-20">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                            <div className="relative inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-2.5 backdrop-blur-md">
                                <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
                                <span className="text-blue-400 text-xs font-black uppercase tracking-[0.3em]">
                                    Engine v2.0 • Flash Accelerated
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter">
                                CODE THE<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">IMPOSSIBLE.</span>
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
                                Transform your abstract visions into production-grade digital experiences using high-fidelity generative intelligence.
                            </p>
                        </div>
                    </div>

                    {/* Futuristic Input Terminal */}
                    <div className="max-w-4xl mx-auto mb-20">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                            Input Terminal // Project Description
                                        </label>
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                        </div>
                                    </div>
                                    
                                    <textarea
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="e.g., Construct a high-performance e-commerce engine with biometric auth and real-time inventory..."
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-6 py-5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none font-mono text-lg min-h-[160px] transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                                    />

                                    <div className="flex gap-4">
                                        <button
                                            onClick={enhancePrompt}
                                            disabled={!userInput || isEnhancing}
                                            className="flex items-center gap-3 px-6 py-3.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl border border-white/10 transition-all font-bold text-xs uppercase tracking-widest"
                                        >
                                            {isEnhancing ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                                            ) : (
                                                <><Wand2 className="h-4 w-4 text-purple-400" /> Enhance Architecture</>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => onGenerate(userInput)}
                                            disabled={!userInput || isGenerating}
                                            className="flex-1 flex items-center justify-center gap-3 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-95"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Synthesizing...</>
                                            ) : (
                                                <><Send className="h-4 w-4" /> Initialize Workspace</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Tab System */}
                    <div className="max-w-4xl mx-auto mb-10">
                        <div className="flex gap-8 border-b border-white/5 p-1">
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${
                                    activeTab === 'create'
                                        ? 'text-blue-400'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                ✨ Quick Start
                                {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('templates')}
                                className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${
                                    activeTab === 'templates'
                                        ? 'text-blue-400'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                🎨 Templates
                                {activeTab === 'templates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${
                                    activeTab === 'recent'
                                        ? 'text-blue-400'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                🕒 Recent
                                {activeTab === 'recent' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
                            </button>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="max-w-4xl mx-auto pb-20">
                        {activeTab === 'create' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-500 cursor-pointer overflow-hidden" onClick={() => setActiveTab('templates')}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Plus className="h-10 w-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">Browse Templates</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Synthesize new environments from pre-configured architectural patterns.</p>
                                </div>
                                
                                <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-500 cursor-pointer overflow-hidden" onClick={() => setActiveTab('recent')}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Clock className="h-10 w-10 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">Recent Projects</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Reconnect with existing project streams and continue neural synthesis.</p>
                                </div>
                                
                                <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-pink-500/50 transition-all duration-500 cursor-pointer overflow-hidden" onClick={() => setShowSettings(true)}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Palette className="h-10 w-10 text-pink-400 mb-6 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">Global Settings</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Calibrate AI parameters and interface aesthetics for peak performance.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recent' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {recentWorkspaces.length > 0 ? (
                                    recentWorkspaces.map((ws) => (
                                        <div
                                            key={ws._id}
                                            onClick={() => handleRecentClick(ws._id)}
                                            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                                        <Code2 className="h-6 w-6 text-purple-400" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                                                        {new Date(ws._creationTime).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-black text-white mb-3 group-hover:text-purple-400 transition-colors truncate tracking-tighter">
                                                    {ws.name || 'DECRYPTED STREAM'}
                                                </h3>
                                                <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2 italic leading-relaxed">
                                                    "{ws.messages?.[0]?.content.slice(0, 100)}..."
                                                </p>
                                                <div className="flex items-center text-purple-400 text-xs font-black uppercase tracking-widest">
                                                    Resync Connection <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl backdrop-blur-sm">
                                        <div className="relative inline-block mb-6">
                                            <Clock className="h-16 w-16 text-gray-700 animate-pulse" />
                                            <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tighter">Memory Banks Empty</h3>
                                        <p className="text-gray-600 font-medium mt-2">Initialize your first project to begin data persistence.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleTemplateClick(template)}
                                        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="text-5xl mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 drop-shadow-2xl">
                                            {template.icon}
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-3 group-hover:text-blue-400 transition-colors uppercase tracking-tighter">
                                            {template.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">Blueprint</span>
                                            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-2 transition-all duration-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Features Section */}
                    <div className="max-w-4xl mx-auto mt-16 pt-12 border-t border-gray-800">
                        <h3 className="text-2xl font-bold text-white mb-8 text-center">Why Choose AI Website Builder?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="bg-blue-500/20 inline-flex p-3 rounded-lg mb-4">
                                    <Zap className="h-6 w-6 text-blue-400" />
                                </div>
                                <h4 className="font-semibold text-white mb-2">Lightning Fast</h4>
                                <p className="text-sm text-gray-400">Generate complete projects in seconds</p>
                            </div>
                            <div className="text-center">
                                <div className="bg-purple-500/20 inline-flex p-3 rounded-lg mb-4">
                                    <Sparkles className="h-6 w-6 text-purple-400" />
                                </div>
                                <h4 className="font-semibold text-white mb-2">AI Powered</h4>
                                <p className="text-sm text-gray-400">Advanced AI models understand your vision</p>
                            </div>
                            <div className="text-center">
                                <div className="bg-pink-500/20 inline-flex p-3 rounded-lg mb-4">
                                    <Code2 className="h-6 w-6 text-pink-400" />
                                </div>
                                <h4 className="font-semibold text-white mb-2">Production Ready</h4>
                                <p className="text-sm text-gray-400">Deploy your code immediately</p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-800 bg-gray-950/50 mt-16">
                    <div className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
                        <p>© 2024 AI Website Builder. Built with ✨ by the AI team.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
