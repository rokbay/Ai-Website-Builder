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
        const unsubChunk = notificationSystem.subscribe(EVENTS.AI_STREAM_CHUNK, (data) => {
            if (data?.chunk) {
                setStreamingContent((prev) => prev + data.chunk);
                applyStreamingChunkToFiles(data.chunk);
            }
        });

        const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, (data) => {
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
            unsubChunk();
            unsubComplete();
            unsubError();
        };
    }, []);

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
        <div className='relative h-full flex flex-col bg-black/20'>
            <div className='bg-gray-950/40 backdrop-blur-2xl w-full px-8 py-5 border-b border-white/5 flex items-center justify-between'>
                <div className='flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner'>
                    {[
                        { id: 'code', label: 'Source', icon: Code2 },
                        { id: 'preview', label: 'Deployment', icon: Zap }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={downloadFiles}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-[10px] font-black transition-all border border-white/10 uppercase tracking-[0.2em] shadow-2xl active:scale-95"
                >
                    <Download className="h-4 w-4 text-blue-400" />
                    Synchronize Local
                </button>
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
                <div className='p-6 bg-black/85 absolute inset-0 rounded-lg w-full h-full flex flex-col items-center justify-center text-left z-20'>
                    <div className='w-full max-w-4xl space-y-4'>
                        <div className='flex items-center gap-3'>
                            <Loader2Icon className='animate-spin h-10 w-10 text-white' />
                            <div>
                                <h2 className='text-lg font-bold text-white'>Generating files...</h2>
                                <p className='text-sm text-slate-300'>Streaming AI code from local .NET bridge.</p>
                            </div>
                        </div>
                        <div className='rounded-2xl border border-blue-500/30 bg-slate-950/95 p-4 min-h-[240px] overflow-auto'>
                            <pre className='whitespace-pre-wrap break-words text-xs leading-5 text-slate-100'>{streamingContent || 'Waiting for stream...'}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CodeView;