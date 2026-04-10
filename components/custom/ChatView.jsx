"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { Link, Loader2Icon, Send, Cpu } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, memo } from 'react';
import { useMutation } from 'convex/react';
import Prompt from '@/data/Prompt';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const MessageItem = memo(({ msg, index }) => (
    <div
        className={`group relative flex gap-4 p-6 transition-all duration-300 ${
            msg.role === 'user' 
                ? 'bg-white/5 border-b border-white/5'
                : 'bg-transparent border-b border-white/5'
        }`}
    >
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-2xl transition-transform group-hover:scale-110 ${
            msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-blue-400 text-white'
                : 'bg-gradient-to-br from-purple-600 to-pink-500 text-white'
        }`}>
            {msg.role === 'user' ? 'USR' : 'SYS'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    msg.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                }`}>
                    {msg.role === 'user' ? 'User Stream' : 'Neural Core Response'}
                </span>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none break-words
                prose-p:mt-0 prose-p:mb-3 prose-strong:text-white prose-code:text-blue-300 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
        </div>
    </div>
));

MessageItem.displayName = 'MessageItem';

function ChatView() {
    const { id } = useParams();
    const { messages, setMessages } = useContext(MessagesContext);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [abortController, setAbortController] = useState(null);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);

    const GetAiResponse = useCallback(async () => {
        const controller = new AbortController();
        setAbortController(controller);
        setLoading(true);
        setStreamingContent('');
        const PROMPT = JSON.stringify(messages) + Prompt.CHAT_PROMPT;
        
        const savedSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    prompt: PROMPT,
                    config: {
                        temperature: savedSettings.temperature,
                        model: savedSettings.aiModel
                    }
                }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let lastUpdateTime = Date.now();

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
                                fullText += data.chunk;

                                // Batch updates to local state every 50ms for better performance
                                const now = Date.now();
                                if (now - lastUpdateTime > 50) {
                                    setStreamingContent(fullText);
                                    lastUpdateTime = now;
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            const finalMessages = [...messages, { role: 'ai', content: fullText }];
            // Update global context ONLY once at the end to prevent heavy CodeView re-renders
            setMessages(finalMessages);
            setStreamingContent('');

            await UpdateMessages({
                messages: finalMessages,
                workspaceId: id
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error('Error getting AI response:', error);
            }
        } finally {
            setLoading(false);
            setAbortController(null);
        }
    }, [messages, id, UpdateMessages, setMessages]);

    const stopGeneration = () => {
        if (abortController) {
            abortController.abort();
        }
    };

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
        <div className="relative h-full flex flex-col bg-gray-950/50 backdrop-blur-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                        <Cpu className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Live Stream</span>
                        <span className="block text-xs font-black text-white uppercase tracking-tighter">Neural Interface</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Linked</span>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} index={index} />
                    ))}
                    
                    {/* Streaming Message */}
                    {streamingContent && (
                        <MessageItem msg={{ role: 'ai', content: streamingContent }} index={messages.length} />
                    )}

                    {loading && !streamingContent && (
                        <div className="p-8 flex flex-col items-center justify-center space-y-4 opacity-50">
                            <div className="relative">
                                <div className="h-10 w-10 rounded-xl border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                            </div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Initializing Synthesis...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="p-6 bg-black/40 backdrop-blur-2xl border-t border-white/5">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
                    <textarea
                        placeholder="Inquire or command..."
                        value={userInput}
                        onChange={(event) => setUserInput(event.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (userInput.trim() && !loading) onGenerate(userInput);
                            }
                        }}
                        className="relative w-full bg-black/60 border border-white/5 rounded-xl p-5 pr-14 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all duration-300 resize-none h-28 font-medium shadow-inner"
                    />
                    <button
                        onClick={() => onGenerate(userInput)}
                        disabled={!userInput.trim() || loading}
                        className={`absolute right-4 bottom-4 p-2.5 rounded-lg transition-all duration-500 ${
                            userInput.trim() && !loading
                                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-100'
                                : 'bg-white/5 text-gray-700 scale-90 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Shift+Enter for newline</span>
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500/30" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;