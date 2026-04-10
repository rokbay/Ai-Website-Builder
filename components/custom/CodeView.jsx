"use client"
import React, { useContext, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import Prompt from '@/data/Prompt';
import { useMutation } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Loader2Icon, Download, Code2, Zap } from 'lucide-react';
import JSZip from 'jszip';import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
const SandpackProvider = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackProvider), { ssr: false });
const SandpackLayout = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackLayout), { ssr: false });
const SandpackCodeEditor = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackCodeEditor), { ssr: false });
const SandpackPreview = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackPreview), { ssr: false });
const SandpackFileExplorer = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackFileExplorer), { ssr: false });

function CodeView({ initialFileData }) {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('code');
    const [files, setFiles] = useState(Lookup?.DEFAULT_FILE);
    const { messages } = useContext(MessagesContext);
    const UpdateFiles = useMutation(api.workspace.UpdateFiles);
    const [loading, setLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isDotNetStreaming, setIsDotNetStreaming] = useState(false);
    const STREAMING_FILE = '/index.js';

    const preprocessFiles = useCallback((files) => {
        const processed = {};
        Object.entries(files).forEach(([path, content]) => {
            if (typeof content === 'string') {
                processed[path] = { code: content };
            } else if (content && typeof content === 'object') {
                if (!content.code && typeof content === 'object') {
                    processed[path] = { code: JSON.stringify(content, null, 2) };
                } else {
                    processed[path] = content;
                }
            }
        });
        return processed;
    }, []);

    const applyStreamingChunkToFiles = useCallback((chunk) => {
        setFiles((prev) => {
            const currentFile = prev[STREAMING_FILE] || { code: '' };
            return {
                ...prev,
                [STREAMING_FILE]: {
                    code: currentFile.code + chunk,
                },
            };
        });
    }, [STREAMING_FILE]);

    useEffect(() => {
        // --- BATCH STREAMING OPTIMIZATION ---
        // Accumulate chunks and update UI at fixed intervals to reduce React re-renders
        let buffer = '';
        const BATCH_INTERVAL_MS = 80;

        const flushBuffer = () => {
            if (buffer.length > 0) {
                const chunkToApply = buffer;
                buffer = '';
                setStreamingContent((prev) => prev + chunkToApply);
                applyStreamingChunkToFiles(chunkToApply);
            }
        };

        const intervalId = setInterval(flushBuffer, BATCH_INTERVAL_MS);

        const unsubChunk = notificationSystem.subscribe(EVENTS.AI_STREAM_CHUNK, (data) => {
            if (data?.chunk) {
                buffer += data.chunk;
            }
        });

        const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, (data) => {
            // Ensure remaining buffer is flushed
            clearInterval(intervalId);
            flushBuffer();

            if (data?.final) {
                setStreamingContent(data.final);
                setFiles((prev) => ({
                    ...prev,
                    [STREAMING_FILE]: { code: data.final },
                }));
            }
            setIsDotNetStreaming(false);
            setLoading(false);
        });

        const unsubError = notificationSystem.subscribe(EVENTS.AI_STREAM_ERROR, (data) => {
            console.error('AI stream error:', data?.message);
            setIsDotNetStreaming(false);
            setLoading(false);
        });

        return () => {
            clearInterval(intervalId);
            unsubChunk();
            unsubComplete();
            unsubError();
        };
    }, [applyStreamingChunkToFiles]);

    useEffect(() => {
        if (initialFileData) {
            const processedFiles = preprocessFiles(initialFileData);
            const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedFiles };
            setFiles(mergedFiles);
        }
    }, [initialFileData, preprocessFiles]);

    const GenerateAiCode = useCallback(async () => {
        setLoading(true);
        setStreamingContent('');
        const PROMPT = JSON.stringify(messages) + " " + Prompt.CODE_GEN_PROMPT;
        
        const savedSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        const useDotNetBridge = typeof window !== 'undefined' && window.webMessageBridge?.request;
        let dotNetStreamStarted = false;

        try {
            if (useDotNetBridge) {
                setIsDotNetStreaming(true);
                dotNetStreamStarted = true;
                await window.webMessageBridge.request('streamAiCode', {
                    prompt: PROMPT,
                    config: {
                        temperature: savedSettings.temperature,
                        model: savedSettings.aiModel,
                        topP: savedSettings.topP ?? 0.95,
                        topK: savedSettings.topK ?? 40,
                        maxOutputTokens: savedSettings.maxOutputTokens ?? 8192,
                    }
                });
                return;
            }

            const response = await fetch('/api/gen-ai-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
            let finalData = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.done && data.final) {
                                finalData = data.final;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (finalData && finalData.files) {
                const processedAiFiles = preprocessFiles(finalData.files || {});
                const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedAiFiles };
                setFiles(mergedFiles);

                await UpdateFiles({
                    workspaceId: id,
                    files: finalData.files
                });
            }
        } catch (error) {
            console.error('Error generating AI code:', error);
            setLoading(false);
        } finally {
            if (!dotNetStreamStarted) {
                setLoading(false);
            }
        }
    }, [messages, id, UpdateFiles, preprocessFiles]);

    useEffect(() => {
        if (messages?.length > 0) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GenerateAiCode();
            }
        }
    }, [messages, GenerateAiCode]);
    
    const downloadFiles = useCallback(async () => {
        try {
            // Create a new JSZip instance
            const zip = new JSZip();
            
            // Add each file to the zip
            Object.entries(files).forEach(([filename, content]) => {
                // Handle the file content based on its structure
                let fileContent;
                if (typeof content === 'string') {
                    fileContent = content;
                } else if (content && typeof content === 'object') {
                    if (content.code) {
                        fileContent = content.code;
                    } else {
                        // If it's an object without code property, stringify it
                        fileContent = JSON.stringify(content, null, 2);
                    }
                }

                // Only add the file if we have content
                if (fileContent) {
                    // Remove leading slash if present
                    const cleanFileName = filename.startsWith('/') ? filename.slice(1) : filename;
                    zip.file(cleanFileName, fileContent);
                }
            });

            // Add package.json with dependencies
            const packageJson = {
                name: "generated-project",
                version: "1.0.0",
                private: true,
                dependencies: Lookup.DEPENDANCY,
                scripts: {
                    "dev": "vite",
                    "build": "vite build",
                    "preview": "vite preview"
                }
            };
            zip.file("package.json", JSON.stringify(packageJson, null, 2));

            // Generate the zip file
            const blob = await zip.generateAsync({ type: "blob" });
            
            // Create download link and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project-files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading files:', error);
        }
    }, [files]);

    return (
        <div className='relative h-full flex flex-col bg-slate-950/20'>
            <div className='bg-slate-950/40 backdrop-blur-3xl w-full px-8 py-4 border-b border-white/5 flex items-center justify-between'>
                <div className='flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5'>
                    {[
                        { id: 'code', label: 'Architecture', icon: Code2 },
                        { id: 'preview', label: 'Deployment', icon: Zap }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-[0.2em] ${
                                activeTab === tab.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={downloadFiles}
                        className="flex items-center gap-3 glass-button-primary py-2 px-5 text-[10px] uppercase tracking-[0.2em]"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Push to Production
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <SandpackProvider
                files={files}
                template="react"
                theme={'dark'}
                customSetup={{
                    dependencies: {
                        ...Lookup.DEPENDANCY
                    },
                    entry: '/index.js'
                }}
                options={{
                    externalResources: ['https://cdn.tailwindcss.com'],
                    bundlerTimeoutSecs: 120,
                    recompileMode: "immediate",
                    recompileDelay: 300
                }}
                >
                    <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0 }}>
                        {activeTab=='code'?<>
                            <SandpackFileExplorer style={{ height: '100%' }} />
                            <SandpackCodeEditor 
                            style={{ height: '100%' }}
                            showTabs
                            showLineNumbers
                            showInlineErrors
                            wrapContent />
                        </>:
                        <>
                            <SandpackPreview 
                                style={{ height: '100%' }}
                                showNavigator={true}
                                showOpenInCodeSandbox={false}
                                showRefreshButton={true}
                            />
                        </>}
                    </SandpackLayout>
                </SandpackProvider>
            </div>

            {loading && (
                <div className='absolute inset-0 z-[200] bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center p-8'>
                    <div className='w-full max-w-5xl holographic-card p-1 animate-in zoom-in-95 duration-500'>
                        <div className="bg-slate-950/90 rounded-[14px] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/40">
                                <div className="flex items-center gap-4">
                                    <Loader2Icon className='animate-spin h-5 w-5 text-blue-400' />
                                    <div className="flex flex-col">
                                        <h2 className='text-[10px] font-black text-white uppercase tracking-[0.2em]'>Neural Synthesis Active</h2>
                                        <span className='text-[9px] font-bold text-slate-500 uppercase tracking-widest'>Local .NET Bridge • Gemini Flash 2.0</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[9px] font-mono text-blue-500/70 uppercase">Streaming...</span>
                                </div>
                            </div>
                            <div className='p-6 max-h-[500px] overflow-y-auto custom-scrollbar font-mono'>
                                <pre className='whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300 selection:bg-blue-500/30'>
                                    {streamingContent || '// Waiting for neural link...'}
                                </pre>
                            </div>
                            <div className="px-6 py-3 border-t border-white/5 bg-slate-900/20 flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Pipeline: WPF_BRIDGE_STABLE</span>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Blocks: {streamingContent.length.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CodeView;