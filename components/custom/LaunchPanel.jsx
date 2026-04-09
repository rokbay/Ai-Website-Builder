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
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_400px_at_50%_300px,#3b82f625,transparent)]" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-xl sticky top-0">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                    <Code2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">AI Website Builder</h1>
                                    <p className="text-sm text-gray-400">Launch your next project in seconds</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </button>
                        </div>
                    </div>
                </header>

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
                <main className="container mx-auto px-4 py-12">
                    {/* Hero Section */}
                    <div className="text-center space-y-8 mb-16">
                        <div>
                            <div className="inline-flex items-center justify-center space-x-2 bg-blue-500/20 rounded-full px-6 py-3 mb-6 border border-blue-500/30">
                                <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
                                <span className="text-blue-400 text-sm font-semibold tracking-wide">
                                    POWERED BY GENERATIVE AI
                                </span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight">
                                Code the Impossible
                            </h2>
                            <p className="text-xl text-gray-400 mt-4 max-w-2xl mx-auto">
                                Describe your vision and let AI transform it into production-ready code. Choose to create custom or use one of our templates.
                            </p>
                        </div>
                    </div>

                    {/* Main Input Section */}
                    <div className="max-w-4xl mx-auto mb-12">
                        <div className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-2xl p-6 shadow-2xl">
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-300 mb-3">
                                    Describe Your Project
                                </label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="e.g., Create a modern e-commerce store with product listings, shopping cart, and user authentication..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                    rows="4"
                                />
                                
                                {/* Input Actions */}
                                <div className="flex gap-3 flex-wrap">
                                    <button
                                        onClick={enhancePrompt}
                                        disabled={!userInput || isEnhancing}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors"
                                    >
                                        {isEnhancing ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Enhancing...</>
                                        ) : (
                                            <><Wand2 className="h-4 w-4" /> Enhance Prompt</>
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => onGenerate(userInput)}
                                        disabled={!userInput || isGenerating}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-semibold"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Launching...</>
                                        ) : (
                                            <><Send className="h-4 w-4" /> Launch Workspace</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="max-w-4xl mx-auto mb-8">
                        <div className="flex gap-4 border-b border-gray-800">
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-4 py-3 font-semibold transition-colors ${
                                    activeTab === 'create'
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                ✨ Quick Start
                            </button>
                            <button
                                onClick={() => setActiveTab('templates')}
                                className={`px-4 py-3 font-semibold transition-colors ${
                                    activeTab === 'templates'
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                🎨 Templates
                            </button>
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`px-4 py-3 font-semibold transition-colors ${
                                    activeTab === 'recent'
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                🕒 Recent
                            </button>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'create' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => setActiveTab('templates')}>
                                    <Plus className="h-8 w-8 text-blue-400 mb-3" />
                                    <h3 className="text-lg font-semibold text-white mb-2">Browse Templates</h3>
                                    <p className="text-sm text-gray-400">Start from pre-built templates</p>
                                </div>
                                
                                <div className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => setActiveTab('recent')}>
                                    <Clock className="h-8 w-8 text-blue-400 mb-3" />
                                    <h3 className="text-lg font-semibold text-white mb-2">Recent Projects</h3>
                                    <p className="text-sm text-gray-400">View your previous work</p>
                                </div>
                                
                                <div className="bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 opacity-50 cursor-not-allowed">
                                    <Palette className="h-8 w-8 text-gray-500 mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Customize Settings</h3>
                                    <p className="text-sm text-gray-500">Coming soon...</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recent' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recentWorkspaces.length > 0 ? (
                                    recentWorkspaces.map((ws) => (
                                        <div
                                            key={ws._id}
                                            onClick={() => handleRecentClick(ws._id)}
                                            className="group bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-xl transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <Code2 className="h-6 w-6 text-blue-400" />
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    {new Date(ws._creationTime).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors truncate">
                                                {ws.name || 'Untitled Project'}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 italic">
                                                "{ws.messages?.[0]?.content.slice(0, 100)}..."
                                            </p>
                                            <div className="flex items-center text-blue-400 text-sm font-medium">
                                                Continue Editing <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl">
                                        <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-400">No recent projects</h3>
                                        <p className="text-gray-500">Start a new project to see it here!</p>
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
                                        className="group bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer"
                                    >
                                        <div className="text-4xl mb-4">{template.icon}</div>
                                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">AI Generated</span>
                                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
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
