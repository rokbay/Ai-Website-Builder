"use client"
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowRight, Link, Sparkles, Send, Wand2, Loader2 } from 'lucide-react';
import React, { useContext, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';

function Hero() {
    const [userInput, setUserInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const { messages, setMessages } = useContext(MessagesContext);
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const router = useRouter();

    const onGenerate = async (input) => {
        const msg = {
            role: 'user',
            content: input
        }
        setMessages(msg);
        const workspaceID = await CreateWorkspace({
            messages: [msg]
        });
        router.push('/workspace/' + workspaceID);
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

    const onSuggestionClick = (suggestion) => {
        setUserInput(suggestion);
    };

    return (
        <div className="min-h-screen bg-gray-950 relative overflow-hidden">
            {/* Holographic background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
            <div className="absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(circle_500px_at_50%_300px,#3b82f615,transparent)] blur-3xl" />
            <div className="absolute -left-20 top-1/4 h-[400px] w-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
            <div className="absolute -right-20 bottom-1/4 h-[400px] w-[400px] bg-blue-600/10 rounded-full blur-[120px]" />

            <div className="container mx-auto px-6 py-20 relative z-10">
                <div className="flex flex-col items-center justify-center space-y-16">
                    {/* Futuristic Hero Header */}
                    <div className="text-center space-y-10">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                            <div className="relative inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-8 py-3 backdrop-blur-md">
                                <Sparkles className="h-6 w-6 text-blue-400 animate-pulse" />
                                <span className="text-blue-400 text-sm font-black uppercase tracking-[0.3em]">
                                    Engine v2.0 • Flash Accelerated
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-7xl md:text-9xl font-black text-white leading-[0.85] tracking-tighter">
                                CODE THE<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">IMPOSSIBLE.</span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed">
                                Transform your abstract visions into production-grade digital experiences using high-fidelity generative intelligence.
                            </p>
                        </div>
                    </div>

                    {/* Futuristic Input Terminal */}
                    <div className="w-full max-w-4xl">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-10 shadow-2xl backdrop-blur-xl">
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                            Input Terminal // Neural Stream
                                        </label>
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                                        </div>
                                    </div>

                                    <div className="flex gap-6">
                                        <textarea
                                            placeholder="INITIALIZE PROJECT DESCRIPTION..."
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-8 py-6 text-gray-100 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none font-mono text-xl min-h-[200px] transition-all shadow-inner"
                                            disabled={isEnhancing}
                                        />
                                        <div className="flex flex-col gap-3">
                                            {userInput && (
                                                <>
                                                    <button
                                                        onClick={enhancePrompt}
                                                        disabled={isEnhancing}
                                                        className={`flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl p-5 transition-all duration-300 shadow-xl active:scale-95 ${isEnhancing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                        title="Enhance Architecture"
                                                    >
                                                        {isEnhancing ? (
                                                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                                        ) : (
                                                            <Wand2 className="h-8 w-8 text-purple-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => onGenerate(userInput)}
                                                        disabled={isEnhancing}
                                                        className={`flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-5 transition-all duration-300 shadow-[0_0_40px_rgba(37,99,235,0.4)] active:scale-95 ${isEnhancing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                        title="Launch Workspace"
                                                    >
                                                        <Send className="h-8 w-8" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex gap-4">
                                            <div className="h-1.5 w-12 rounded-full bg-blue-500/20" />
                                            <div className="h-1.5 w-12 rounded-full bg-purple-500/20" />
                                            <div className="h-1.5 w-12 rounded-full bg-pink-500/20" />
                                        </div>
                                        <Link className="h-5 w-5 text-gray-600 hover:text-blue-400 transition-colors duration-300 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Holographic Suggestions Grid */}
                    <div className="w-full max-w-5xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Lookup?.SUGGSTIONS.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="group relative p-6 bg-gray-900/50 hover:bg-gray-800/60 border-2 border-electric-blue-500/20 rounded-xl text-left transition-all duration-300 hover:border-electric-blue-500/40 hover:shadow-[0_0_20px_2px_rgba(59,130,246,0.2)]"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_50%,#3b82f620)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                                    <span className="text-electric-blue-400/80 group-hover:text-electric-blue-400 font-mono text-sm tracking-wide transition-colors duration-300">
                                        {suggestion}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Hero;