"use client"
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import { SYSTEM_PROMPTS } from '@/prompts/system_prompts';
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
            surface1: "#ffffff",
            surface2: "#fafaf9",
            surface3: "#f5f5f4",
            clickable: "#78716c",
            base: "#1c1917",
            disabled: "#a8a29e",
            hover: "#1c1917",
            accent: "#2563eb",
            error: "#ef4444",
            errorSurface: "#fee2e2",
        },
        syntax: {
            plain: "#1c1917",
            comment: { color: "#a8a29e", fontStyle: "italic" },
            keyword: "#2563eb",
            tag: "#0891b2",
            punctuation: "#78716c",
            definition: "#1c1917",
            property: "#2563eb",
            static: "#db2777",
            string: "#16a34a",
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
        let buffer = []; // Array of Uint8Arrays
        const BATCH_INTERVAL_MS = 80;
        const flushBuffer = () => {
            if (buffer.length > 0) {
                const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const b of buffer) {
                    combined.set(b, offset);
                    offset += b.length;
                }
                const chunkToApply = new TextDecoder().decode(combined);
                buffer = [];
                setStreamingContent((prev) => prev + chunkToApply);
                applyStreamingChunkToFiles(chunkToApply);
            }
        };
        const intervalId = setInterval(flushBuffer, BATCH_INTERVAL_MS);
        const unsubChunk = notificationSystem.subscribe(EVENTS.AI_STREAM_CHUNK, (data) => {
            if (data?.delta) {
                const uint8 = new TextEncoder().encode(data.delta);
                buffer.push(uint8);
            }
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
        <div className='relative h-full flex flex-col bg-white overflow-hidden font-sans antialiased'>
            {/* Elite Web2 Header */}
            <div className='bg-white px-8 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm z-10'>
                <div className="flex items-center gap-6">
                    <div className='flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200'>
                        {[
                            { id: 'code', label: 'Code', icon: Code2 },
                            { id: 'preview', label: 'Preview', icon: Zap },
                            { id: 'structure', label: 'Tree', icon: Layers }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest ${
                                    activeTab === tab.id
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="h-4 w-px bg-stone-200" />
                    <div className="flex items-center gap-2 text-stone-400">
                        <Layers className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{Object.keys(files).length} Files</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {loading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mr-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Compiling</span>
                        </div>
                    )}
                    <button
                        onClick={downloadFiles}
                        className="flex items-center gap-2 glass-button-primary py-2 px-4 text-[9px]"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export
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