"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { useConvex, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState, useCallback, memo } from 'react';
import { Loader2Icon, Send, Terminal, Cpu, Zap, Square } from "lucide-react";
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import { aiProviderManager } from '@/lib/AiProviderManager';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

const MessageItem = memo(({ msg, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`group relative flex gap-4 p-6 m-4 rounded-[24px] border border-white/5 transition-all duration-300 ${
            msg.role === 'user' 
                ? 'bg-white/[0.03] shadow-[0_8px_32px_rgba(37,99,235,0.05)]'
                : 'bg-white/[0.01] shadow-[0_8px_32px_rgba(255,255,255,0.02)]'
        }`}
    >
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-2xl transition-transform group-hover:scale-105 ${
            msg.role === 'user'
                ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400'
                : 'bg-gradient-to-br from-slate-900 to-black border border-white/10 text-white'
        }`}>
            {msg.role === 'user' ? 'USR' : 'SYS'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${
                    msg.role === 'user' ? 'text-blue-500' : 'text-slate-500'
                }`}>
                    {msg.role === 'user' ? 'USER_SPEC' : 'NEURAL_GEN'}
                </span>
            </div>
            <div className="text-sm text-slate-300 leading-[1.8] prose prose-invert prose-sm max-w-none break-words
                prose-p:mt-0 prose-p:mb-4 prose-strong:text-white prose-strong:font-black prose-code:text-blue-400 prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
        </div>
    </motion.div>
));

MessageItem.displayName = 'MessageItem';

function ChatView() {
    const { id } = useParams();
    const { messages, setMessages } = useContext(MessagesContext);
    const setMessagesMutation = useMutation(api.workspace.UpdateWorkspace);
    const triggerAiMutation = useMutation(api.workspace.StartAiGeneration); 
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [abortController, setAbortController] = useState(null);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);
    const setStreamingStatus = useMutation(api.workspace.SetStreamingStatus);

    const GetAiResponse = useCallback(async () => {
        const nextMessages = [...messages];
        
        try {
            setLoading(true);
            await setStreamingStatus({ workspaceId: id, isStreaming: true });
            
          const result = await aiProviderManager.getResponse({
                messages: nextMessages,
                workspaceId: id,
                streamAction: triggerAiMutation, // <-- Pass the new Mutation!
                updateMessages: UpdateMessages
            });

            if (result.content) {
                setMessages(result.messages);
            }
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            notificationSystem.publish(EVENTS.STATUS_UPDATE, {
                message: `Synthesis Error: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
            await setStreamingStatus({ workspaceId: id, isStreaming: false });
        }
    }, [messages, id, UpdateMessages, setMessages, triggerAiMutation, setStreamingStatus]);

    useEffect(() => {
        if (messages?.length > 0) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GetAiResponse();
            }
        }
    }, [messages, GetAiResponse]);

    useEffect(() => {
        // NotificationSystem wraps payloads as { type, data, timestamp }
        // So callbacks receive the full event object — we must unwrap .data
        const unsub = notificationSystem.subscribe(EVENTS.AI_STREAM_CHUNK, (event) => {
            const data = event?.data ?? event;
            if (data?.full) {
                // Slice at first JSON object OR first markdown code fence
                const jsonIdx  = data.full.indexOf('{');
                const fenceIdx = data.full.indexOf('```');
                const candidates = [jsonIdx, fenceIdx].filter(i => i !== -1);
                const cutIdx = candidates.length ? Math.min(...candidates) : -1;
                const chatText = cutIdx === -1 ? data.full : data.full.slice(0, cutIdx).trimEnd();
                setStreamingContent(chatText);
                setLoading(false);
            }
        });

        const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, (event) => {
            const data = event?.data ?? event;
            // Delay clear so the final persisted message has time to render
            // before the live streaming bubble disappears
            setTimeout(() => setStreamingContent(''), 200);
        });

        return () => {
            unsub();
            unsubComplete();
        };
    }, []);

    const onGenerate = useCallback((input) => {
        setMessages(prev => [...prev, {
            role: 'user',
            content: input
        }]);
        setUserInput('');
    }, [setMessages]);

    const onStop = useCallback(async () => {
        aiProviderManager.stopGeneration();
        setLoading(false);
        setStreamingContent('');
        await setStreamingStatus({ workspaceId: id, isStreaming: false });
    }, [id, setStreamingStatus]);

    return (
        <div className="relative h-full flex flex-col bg-stone-50 overflow-hidden">
            {/* Pro Workspace Header */}
            <div className="px-8 py-4 border-b border-stone-200 bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <Terminal className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mb-1">Neural Synthesis</span>
                        <span className="block text-[11px] font-black text-stone-800 uppercase tracking-tighter">Live Session</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-stone-50 border border-stone-200">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Connected</span>
                </div>
            </div>

            {/* Stream Logs */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-mesh">
                <div className="flex flex-col">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} index={index} />
                    ))}
                    
                    {streamingContent && (
                        <MessageItem msg={{ role: 'ai', content: streamingContent }} index={messages.length} />
                    )}

                    {loading && !streamingContent && (
                        <div className="p-12 flex flex-col items-center justify-center space-y-6">
                            <Loader2Icon className="h-8 w-8 text-blue-200 animate-spin" />
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.4em] animate-pulse">Initializing Synthesis...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Command Interface */}
            <div className="px-8 pb-8 bg-transparent">
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-blue-600/5 rounded-[28px] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-1000" />
                    <div className="relative flex items-center bg-white/80 backdrop-blur-3xl border border-stone-200 rounded-[24px] p-2 pr-4 shadow-xl">
                        <textarea
                            placeholder="Type a message..."
                            value={userInput}
                            aria-label="New Message Input"
                            onChange={(event) => setUserInput(event.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (userInput.trim() && !loading) onGenerate(userInput);
                                }
                            }}
                            className="w-full bg-transparent border-none p-4 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none h-14 font-medium custom-scrollbar"
                        />
                        <button
                            onClick={() => onGenerate(userInput)}
                            disabled={!userInput.trim() || loading}
                            aria-label="Send Message for Synthesis"
                            className={`flex-shrink-0 p-3 rounded-2xl transition-all duration-500 ${
                                userInput.trim() && !loading
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100 hover:scale-105 hover:bg-blue-700'
                                    : 'bg-stone-100 text-stone-400 scale-95 opacity-50'
                            }`}
                        >
                            {loading ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                        {loading && (
                            <button
                                onClick={onStop}
                                aria-label="Stop generation"
                                className="flex-shrink-0 ml-2 p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all duration-300"
                            >
                                <Square className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-amber-500/50" />
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em]">Shift+Enter for multi-line block</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;