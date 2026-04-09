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
        className={`p-4 rounded-lg ${
            msg.role === 'user' 
                ? 'bg-gray-800/50 border border-gray-700' 
                : 'bg-gray-800/30 border border-gray-700'
        }`}
    >
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
                msg.role === 'user' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-purple-500/20 text-purple-400'
            }`}>
                {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <ReactMarkdown className="prose prose-invert flex-1 overflow-auto">
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
        
        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({ prompt: PROMPT }),
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
        <div className="relative h-[85vh] flex flex-col bg-gray-900">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} index={index} />
                    ))}
                    
                    {/* Streaming Message */}
                    {streamingContent && (
                        <MessageItem msg={{ role: 'ai', content: streamingContent }} index={messages.length} />
                    )}

                    {loading && (
                        <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Loader2Icon className="animate-spin h-5 w-5" />
                                    <p className="font-medium">
                                        {!streamingContent ? 'Generating response...' : 'AI is typing...'}
                                    </p>
                                </div>
                                {abortController && (
                                    <button
                                        onClick={stopGeneration}
                                        className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1 rounded-full transition-all"
                                    >
                                        Stop Generation
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex gap-3">
                            <textarea
                                placeholder="Type your message here..."
                                value={userInput}
                                onChange={(event) => setUserInput(event.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none h-32"
                            />
                            {userInput && (
                                <button
                                    onClick={() => onGenerate(userInput)}
                                    className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl px-4 transition-all duration-200"
                                >
                                    <Send className="h-6 w-6 text-white" />
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end mt-3">
                            <Link className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;