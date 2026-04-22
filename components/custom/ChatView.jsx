"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { useConvex, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState, useCallback, memo } from 'react';
import { Loader2Icon, Send, Terminal, Cpu, Zap } from "lucide-react";
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import Prompt from '@/data/Prompt';
import ReactMarkdown from 'react-markdown';

const MessageItem = memo(({ msg, index }) => (
    <div
        className={`group relative flex gap-4 p-8 transition-all duration-300 ${
            msg.role === 'user' 
                ? 'bg-black/40 border-b border-white/5'
                : 'bg-white/[0.02] border-b border-white/5'
        }`}
    >
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-black shadow-2xl transition-transform group-hover:scale-105 ${
            msg.role === 'user'
                ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400'
                : 'bg-gradient-to-br from-slate-900 to-black border border-white/10 text-white'
        }`}>
            {msg.role === 'user' ? 'USR' : 'SYS'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                    msg.role === 'user' ? 'text-blue-500' : 'text-slate-500'
                }`}>
                    {msg.role === 'user' ? 'USER_STREAM' : 'NEURAL_SYNTHESIS'}
                </span>
                <span className="text-[9px] font-mono text-slate-800 group-hover:text-slate-600 transition-colors">
                    SEQ_00{index + 1}
                </span>
            </div>
            <div className="text-sm text-slate-300 leading-[1.8] prose prose-invert prose-sm max-w-none break-words
                prose-p:mt-0 prose-p:mb-4 prose-strong:text-white prose-strong:font-black prose-code:text-blue-400 prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
        </div>
    </div>
));

MessageItem.displayName = 'MessageItem';

function ChatView() {
    const { id } = useParams();
    const { messages, setMessages } = useContext(MessagesContext);
    const setMessagesMutation = useMutation(api.workspace.UpdateWorkspace);
    const streamAction = useAction(api.actions.StreamAiAction);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [abortController, setAbortController] = useState(null);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);

    const GetAiResponse = useCallback(async () => {
        const nextMessages = [...messages];
        const msg = nextMessages[nextMessages.length - 1].content;
        
        try {
            setLoading(true);
            const messageIndex = nextMessages.length;
            const finalMessages = [...nextMessages, { role: 'ai', content: '' }];
            
            // Update local state immediately for snappy UI
            setMessages(finalMessages);
            
            // 1. Save placeholder to DB so the backend action has an index to mutate
            await UpdateMessages({
                messages: finalMessages,
                workspaceId: id
            });
            
            // 2. Trigger the real-time Convex Action to handle streaming natively
            await streamAction({
                workspaceId: id,
                prompt: msg,
                model: 'gemini-1.5-flash',
                messageIndex: messageIndex
            });
            
        } catch (error) {
            console.error('Error getting AI response:', error);
        } finally {
            setLoading(false);
        }
    }, [messages, id, UpdateMessages, setMessages]);

    useEffect(() => {
        if (messages?.length > 0) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GetAiResponse();
            }
        }
    }, [messages, GetAiResponse]);

    const onGenerate = useCallback((input) => {
        setMessages(prev => [...prev, {
            role: 'user',
            content: input
        }]);
        setUserInput('');
    }, [setMessages]);

    return (
        <div className="relative h-full flex flex-col bg-black overflow-hidden">
            {/* Pro Workspace Header */}
            <div className="px-8 py-6 border-b border-white/5 bg-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                        <Terminal className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] leading-none mb-1">Neural Interface</span>
                        <span className="block text-[11px] font-black text-white uppercase tracking-tighter">Workspace_Session_Live</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol_Sync_Stable</span>
                </div>
            </div>

            {/* Stream Logs */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-mesh bg-opacity-10">
                <div className="flex flex-col">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} index={index} />
                    ))}
                    
                    {streamingContent && (
                        <MessageItem msg={{ role: 'ai', content: streamingContent }} index={messages.length} />
                    )}

                    {loading && !streamingContent && (
                        <div className="p-12 flex flex-col items-center justify-center space-y-6 opacity-40">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-2xl border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full" />
                            </div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">Requesting Synthesis...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Command Interface */}
            <div className="p-8 bg-black border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-blue-400/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                    <textarea
                        placeholder="INPUT NEW SPECIFICATIONS..."
                        value={userInput}
                        aria-label="New Message Input"
                        onChange={(event) => setUserInput(event.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (userInput.trim() && !loading) onGenerate(userInput);
                            }
                        }}
                        className="relative w-full bg-surface-secondary/50 border border-white/5 rounded-xl p-6 pr-16 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300 resize-none h-32 font-medium"
                    />
                    <button
                        onClick={() => onGenerate(userInput)}
                        disabled={!userInput.trim() || loading}
                        aria-label="Send Message for Synthesis"
                        className={`absolute right-4 bottom-4 p-3 rounded-xl transition-all duration-500 ${
                            userInput.trim() && !loading
                                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-100 hover:scale-105 hover:bg-blue-500'
                                : 'bg-white/5 text-slate-800 scale-95 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <Send className="h-5 w-5" />
                    </button>
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