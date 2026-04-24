"use client"
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowRight, Sparkles, Send, Wand2, Loader2, Cpu, Terminal, Shield } from 'lucide-react';
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
            let buffer = []; // Array of Uint8Arrays

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer.push(value);

                // Combine and decode
                const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const b of buffer) {
                    combined.set(b, offset);
                    offset += b.length;
                }

                const chunk = decoder.decode(combined);
                const lines = chunk.split('\n');

                let enhancedText = '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) {
                                enhancedText += data.chunk;
                            }
                        } catch (e) {}
                    }
                }
                if (enhancedText) {
                    setUserInput(enhancedText);
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
        <div className="min-h-screen bg-black relative overflow-hidden bg-grid-pattern">
            {/* Mesh Gradient Foundation */}
            <div className="absolute inset-0 bg-mesh opacity-40" />
            
            <div className="container mx-auto px-6 py-24 relative z-10 max-w-[1400px]">
                <div className="flex flex-col items-center justify-center space-y-20">
                    
                    {/* High-Density Header */}
                    <div className="text-center space-y-8 max-w-4xl">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                                <Cpu className="h-3 w-3 text-blue-400" />
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Engine v2.0 // Local Core</span>
                            </div>
                            <div className="px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <Shield className="h-3 w-3 text-emerald-400" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em]">Secure Environment</span>
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-[7rem] font-black text-white leading-[0.85] tracking-tighter">
                            SYNTHESIZE<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-200">PROJECTS.</span>
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed uppercase tracking-tighter">
                            Initialize high-fidelity digital architectures using accelerated neural synthesis and local-first compute.
                        </p>
                    </div>

                    {/* Industrial Command Center */}
                    <div className="w-full max-w-5xl">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                            <div className="relative bg-surface/80 border border-white/5 rounded-2xl p-8 shadow-2xl backdrop-blur-2xl">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-3">
                                            <Terminal className="h-4 w-4 text-slate-500" />
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                                Neural Input Interface // Prompt_v.2.1
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Blocks: {userInput.length}</span>
                                            <div className="h-2 w-px bg-white/5" />
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Status: Ready</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-6">
                                        <textarea
                                            placeholder="DESCRIBE ARCHITECTURAL SPECIFICATIONS..."
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-8 py-8 text-slate-100 placeholder-slate-800 focus:outline-none focus:border-blue-500/30 transition-all font-mono text-xl min-h-[250px] shadow-inner"
                                            disabled={isEnhancing}
                                            aria-label="Code Blueprint Input"
                                        />
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={enhancePrompt}
                                                disabled={isEnhancing || !userInput}
                                                aria-label="Enhance Prompt via Neural Synthesizer"
                                                className={`flex items-center justify-center rounded-xl h-24 w-24 transition-all duration-300 active:scale-95 border border-white/5 ${isEnhancing ? 'bg-white/5 opacity-50' : 'bg-white/5 hover:bg-white/10 hover:border-blue-500/30 shadow-blue-500/10 hover:shadow-xl'}`}
                                            >
                                                {isEnhancing ? (
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                ) : (
                                                    <Wand2 className="h-8 w-8 text-slate-400 group-hover:text-blue-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => onGenerate(userInput)}
                                                disabled={isEnhancing || !userInput}
                                                aria-label="Execute Neural Synthesis"
                                                className={`flex items-center justify-center rounded-xl flex-1 w-24 transition-all duration-300 active:scale-95 border ${!userInput ? 'bg-slate-900 border-white/5 opacity-30 cursor-not-allowed' : 'bg-blue-600 border-blue-500 hover:bg-blue-500 hover:spec-glow-blue hover:shadow-blue-500/20 shadow-lg'}`}
                                            >
                                                <Send className="h-8 w-8 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 pt-4">
                                        <div className="flex-1 h-px bg-white/5" />
                                        <div className="flex gap-3">
                                            {['React', 'Next.js', 'Vite', 'Tailwind'].map(tech => (
                                                <span key={tech} className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-2 py-1 rounded bg-white/5">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Holographic Suggestions Row */}
                    <div className="w-full max-w-6xl overflow-hidden pb-10">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {Lookup?.SUGGSTIONS.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="whitespace-nowrap px-6 py-4 bg-surface/40 hover:bg-blue-600/5 border border-white/5 rounded-xl text-left transition-all hover:border-blue-500/20 active:scale-95 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-800 group-hover:bg-blue-500 transition-colors" />
                                        <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-200 uppercase tracking-widest transition-colors">
                                            {suggestion}
                                        </span>
                                    </div>
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