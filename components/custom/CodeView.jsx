"use client"
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import Prompt from '@/data/Prompt';
import { useMutation } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Loader2Icon, Download, Code2, Zap, Terminal, Cpu, Share2, Layers, Maximize2 } from 'lucide-react';
import JSZip from 'jszip';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';

const SandpackProvider = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackProvider), { ssr: false });
const SandpackLayout = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackLayout), { ssr: false });
const SandpackCodeEditor = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackCodeEditor), { ssr: false });
const SandpackPreview = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackPreview), { ssr: false });
const SandpackFileExplorer = dynamic(() => import("@codesandbox/sandpack-react").then(mod => mod.SandpackFileExplorer), { ssr: false });
import DOMParserPane from './DOMParserPane';

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

    // Pro IDE Theme Definition for High Readability
    const proTheme = useMemo(() => ({
        colors: {
            surface1: "#000000",
            surface2: "#0a0a0a",
            surface3: "#1a1a1a",
            clickable: "#808080",
            base: "#e5e7eb",
            disabled: "#4d4d4d",
            hover: "#ffffff",
            accent: "#3b82f6",
            error: "#ef4444",
            errorSurface: "#2d1616",
        },
        syntax: {
            plain: "#e5e7eb",
            comment: { color: "#6b7280", fontStyle: "italic" },
            keyword: "#93c5fd",
            tag: "#60a5fa",
            punctuation: "#94a3b8",
            definition: "#bfdbfe",
            property: "#60a5fa",
            static: "#c084fc",
            string: "#34d399",
        },
        font: {
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            mono: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
            size: "13px",
            lineHeight: "1.6",
        },
    }), []);

    const preprocessFiles = useCallback((files) => {
        const processed = {};
        Object.entries(files).forEach(([path, content]) => {
            if (typeof content === 'string') {
                processed[path] = { code: content };
            } else if (content && typeof content === 'object') {
                processed[path] = content.code ? content : { code: JSON.stringify(content, null, 2) };
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
            if (data?.chunk) buffer += data.chunk;
        });
        const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, (data) => {
            clearInterval(intervalId);
            flushBuffer();
            if (data?.final) {
                setStreamingContent(data.final);
                setFiles((prev) => ({ ...prev, [STREAMING_FILE]: { code: data.final } }));
            }
            setLoading(false);
        });
        const unsubError = () => setLoading(false);
        return () => {
            clearInterval(intervalId);
            unsubChunk();
            unsubComplete();
        };
    }, [applyStreamingChunkToFiles]);

    useEffect(() => {
        if (initialFileData) {
            const processedFiles = preprocessFiles(initialFileData);
            setFiles({ ...Lookup.DEFAULT_FILE, ...processedFiles });
        }
    }, [initialFileData, preprocessFiles]);

    const downloadFiles = useCallback(async () => {
        try {
            const zip = new JSZip();
            Object.entries(files).forEach(([filename, content]) => {
                let fileContent = typeof content === 'string' ? content : (content?.code || JSON.stringify(content, null, 2));
                if (fileContent) zip.file(filename.startsWith('/') ? filename.slice(1) : filename, fileContent);
            });
            const blob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'project.zip'; a.click();
        } catch (e) {}
    }, [files]);

    return (
        <div className='relative h-full flex flex-col bg-black overflow-hidden font-sans antialiased'>
            {/* Elite Web2 Header */}
            <div className='bg-black px-8 py-5 border-b border-white/5 flex items-center justify-between'>
                <div className="flex items-center gap-6">
                    <div className='flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5'>
                        {[
                            { id: 'code', label: 'Architecture', icon: Code2 },
                            { id: 'preview', label: 'Deployment', icon: Zap },
                            { id: 'structure', label: 'Structure', icon: Layers }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                                        : 'text-slate-500 hover:text-slate-200'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="h-4 w-px bg-white/5" />
                    <div className="flex items-center gap-3 text-slate-500">
                        <Layers className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Files: {Object.keys(files).length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {loading && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 mr-2">
                            <div className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Synthesizing...</span>
                        </div>
                    )}
                    <button
                        onClick={downloadFiles}
                        className="flex items-center gap-3 glass-button-primary py-2.5 px-6 border-blue-500/20"
                    >
                        <Download className="h-4 w-4" />
                        Production_Export
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <SandpackProvider
                    files={files}
                    template="react"
                    theme={proTheme}
                    customSetup={{ dependencies: { ...Lookup.DEPENDANCY }, entry: '/index.js' }}
                    options={{
                        externalResources: ['https://cdn.tailwindcss.com'],
                        bundlerTimeoutSecs: 120,
                        recompileMode: "immediate",
                    }}
                >
                    <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0, background: 'transparent' }}>
                        {activeTab === 'code' && (
                            <>
                                <SandpackFileExplorer style={{ height: '100%', borderRight: '1px solid rgba(255,255,255,0.05)' }} />
                                <SandpackCodeEditor 
                                    style={{ height: '100%' }}
                                    showTabs 
                                    showLineNumbers 
                                    showInlineErrors 
                                    wrapContent
                                    closableTabs
                                />
                            </>
                        )}
                        {activeTab === 'preview' && (
                            <div className="flex-1 bg-white relative h-full">
                                <SandpackPreview 
                                    style={{ height: '100%' }}
                                    showNavigator={true} 
                                    showOpenInCodeSandbox={false} 
                                    showRefreshButton={true}
                                />
                            </div>
                        )}
                        {activeTab === 'structure' && (
                            <div className="flex-1 relative h-full">
                                <DOMParserPane code={files[STREAMING_FILE]?.code || ''} />
                            </div>
                        )}
                    </SandpackLayout>
                </SandpackProvider>
            </div>

            {/* Loading Modal Removed for Studio Parity - Streams Directly to CodeEditor */}
        </div>
    );
}

export default CodeView;