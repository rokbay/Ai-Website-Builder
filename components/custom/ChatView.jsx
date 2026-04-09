"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { Link, Loader2Icon, Send } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, memo } from 'react';
import { useMutation } from 'convex/react';
import Prompt from '@/data/Prompt';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const MessageItem = memo(({ msg, index }) => (
    <div
        className={`group relative flex gap-3 p-4 transition-colors ${
            msg.role === 'user' 
                ? 'bg-blue-500/5 border-l-2 border-l-blue-500'
                : 'bg-purple-500/5 border-l-2 border-l-purple-500'
        }`}
    >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
            msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-purple-600 text-white'
        }`}>
            {msg.role === 'user' ? 'U' : 'AI'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                    msg.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                }`}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
            </div>
            <ReactMarkdown className="text-sm text-gray-200 leading-relaxed prose prose-invert prose-sm max-w-none break-words
                prose-p:mt-0 prose-p:mb-2 prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-code:text-blue-300">
                {msg.content}
            </ReactMarkdown>
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
        <div className="relative h-full flex flex-col bg-gray-950">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Send className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="font-bold text-white tracking-tight">AI Assistant</span>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="divide-y divide-gray-800/50">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} index={index} />
                    ))}
                    
                    {/* Streaming Message */}
                    {streamingContent && (
                        <MessageItem msg={{ role: 'ai', content: streamingContent }} index={messages.length} />
                    )}

                    {loading && (
                        <div className="p-6 bg-gray-900/20 border-t border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-gray-500">
                                    <div className="relative">
                                        <div className="h-5 w-5 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                                    </div>
                                    <p className="text-xs font-medium uppercase tracking-widest">
                                        {!streamingContent ? 'Thinking...' : 'Typing...'}
                                    </p>
                                </div>
                                {abortController && (
                                    <button
                                        onClick={stopGeneration}
                                        className="text-[10px] uppercase font-bold tracking-tighter bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1 rounded transition-all border border-red-500/20"
                                    >
                                        Abort
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="p-4 bg-gray-900/80 backdrop-blur-md border-t border-gray-800">
                <div className="relative group">
                    <textarea
                        placeholder="Ask me to modify the code..."
                        value={userInput}
                        onChange={(event) => setUserInput(event.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 pr-12 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-300 resize-none h-24 shadow-inner"
                    />
                    <button
                        onClick={() => onGenerate(userInput)}
                        disabled={!userInput.trim() || loading}
                        className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all duration-300 ${
                            userInput.trim() && !loading
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-100'
                                : 'bg-gray-800 text-gray-600 scale-90 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center uppercase tracking-widest opacity-50">
                    Enter to send • Shift + Enter for new line
                </p>
            </div>
        </div>
    );
}

export default ChatView;