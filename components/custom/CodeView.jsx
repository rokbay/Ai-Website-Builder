"use client"
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import { SYSTEM_PROMPTS } from '@/prompts/system_prompts';
import { useMutation } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Loader2Icon, Download, Code2, Zap, Terminal, Cpu, Share2, Layers, Maximize2, Play } from 'lucide-react';
import JSZip from 'jszip';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';
import DOMParserPane from './DOMParserPane';

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
    const [isGenerating, setIsGenerating] = useState(false); // Task 3: generation overlay
    const [showPreviewPane, setShowPreviewPane] = useState(false); // Task 2: run button
    const [previewHtml, setPreviewHtml] = useState('');           // Task 4: iframe html
    const editorScrollRef = useRef(null);
    const STREAMING_FILE = '/index.js';

    const proTheme = useMemo(() => ({
        colors: {
            surface1: "#ffffff", surface2: "#fafaf9", surface3: "#f5f5f4",
            clickable: "#78716c", base: "#1c1917", disabled: "#a8a29e",
            hover: "#1c1917", accent: "#2563eb", error: "#ef4444", errorSurface: "#fee2e2",
        },
        syntax: {
            plain: "#1c1917",
            comment: { color: "#a8a29e", fontStyle: "italic" },
            keyword: "#2563eb", tag: "#0891b2", punctuation: "#78716c",
            definition: "#1c1917", property: "#2563eb", static: "#db2777", string: "#16a34a",
        },
        font: {
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            mono: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
            size: "13px", lineHeight: "1.6",
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

    const extractFilesFromText = useCallback((text) => {
        let extracted = {};
        const parts = text.split(/"(\/[^"]+)"\s*:\s*\{\s*"code"\s*:\s*"/);
        for (let i = 1; i < parts.length; i += 2) {
            const filename = parts[i];
            let codeAndGarbage = parts[i + 1];
            const match = codeAndGarbage.match(/([\s\S]*?)"(?:\s*\}|\s*,|\s*$)/);
            let code = match ? match[1] : codeAndGarbage;
            code = code.replace(/\\(.)/g, (m, char) => {
                if (char === 'n') return '\n';
                if (char === 'r') return '\r';
                if (char === 't') return '\t';
                if (char === '"') return '"';
                if (char === '\\') return '\\';
                return char;
            });
            extracted[filename] = { code };
        }
        return extracted;
    }, []);

    const applyStreamingChunkToFiles = useCallback((fullStreamedText) => {
        const liveFiles = extractFilesFromText(fullStreamedText);
        setFiles((prev) => {
            if (Object.keys(liveFiles).length > 0) {
                return { ...prev, ...liveFiles };
            } else {
                return {
                    ...prev,
                    [STREAMING_FILE]: { code: '/* Generating payload...\n' + fullStreamedText + '\n*/' },
                };
            }
        });
    }, [extractFilesFromText]);

    // Task 4: Build iframe HTML from files using factory method pattern
    const buildPreviewHtml = useCallback((currentFiles) => {
        // Extract the main App code
        const appFile = currentFiles['/App.js'] || currentFiles['/app.js'];
        const cssFile = currentFiles['/App.css'] || currentFiles['/styles.css'] || currentFiles['/index.css'];
        const appCode = appFile?.code || '';
        const cssCode = cssFile?.code || '';

        // Factory: produce a self-contained HTML document that bootstraps React
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${cssCode}</style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${appCode}
    const rootEl = document.getElementById('root');
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
  </script>
</body>
</html>`;
    }, []);

    // Task 2: Run button handler — builds HTML and shows preview pane
    const handleRun = useCallback(() => {
        const html = buildPreviewHtml(files);
        setPreviewHtml(html);
        setShowPreviewPane(true);
        setActiveTab('preview');
    }, [files, buildPreviewHtml]);

    useEffect(() => {
        let buffer = [];
        const BATCH_INTERVAL_MS = 80;
        const flushBuffer = () => {
            if (buffer.length > 0) {
                const totalLength = buffer.reduce((acc, curr) => acc + curr.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const b of buffer) { combined.set(b, offset); offset += b.length; }
                const chunkToApply = new TextDecoder().decode(combined);
                buffer = [];
                setStreamingContent((prev) => {
                    const newContent = prev + chunkToApply;
                    applyStreamingChunkToFiles(newContent);
                    return newContent;
                });
            }
        };
        const intervalId = setInterval(flushBuffer, BATCH_INTERVAL_MS);

        const unsubChunk = notificationSystem.subscribe(EVENTS.AI_STREAM_CHUNK, (event) => {
            const data = event?.data ?? event;
            if (data?.delta) {
                setIsGenerating(true); // Task 3: show overlay
                const uint8 = new TextEncoder().encode(data.delta);
                buffer.push(uint8);
            }
        });

        const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, (event) => {
            clearInterval(intervalId);
            flushBuffer();
            const data = event?.data ?? event;
            if (data?.final) {
                let parsedFiles = null;
                try {
                    let jsonText = data.final;
                    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) jsonText = jsonMatch[1];
                    // Strip plain text before the JSON object
                    const jsonStart = jsonText.indexOf('{');
                    if (jsonStart > 0) jsonText = jsonText.slice(jsonStart);
                    try {
                        const parsed = JSON.parse(jsonText);
                        if (parsed && parsed.files) parsedFiles = parsed.files;
                    } catch (parseError) {
                        const extracted = extractFilesFromText(jsonText);
                        if (Object.keys(extracted).length > 0) {
                            parsedFiles = extracted;
                        } else {
                            // Weak model fallback: extract code from markdown fences
                            const fenceMatch = data.final.match(/```(?:jsx?|tsx?|javascript|js)??([\s\S]*?)```/);
                            if (fenceMatch && fenceMatch[1].trim()) {
                                parsedFiles = { '/App.js': { code: fenceMatch[1].trim() } };
                            }
                        }
                    }
                } catch (e) {
                    console.error("[CodeView] Fatal parsing error:", e);
                }
                setFiles((prev) => {
                    let newFiles = { ...prev };
                    if (parsedFiles) {
                        newFiles = { ...newFiles, ...parsedFiles };
                        // Always clean the streaming buffer file
                        newFiles[STREAMING_FILE] = { code: '// Cleaned temporary stream buffer' };
                    } else {
                        newFiles[STREAMING_FILE] = { code: data.final };
                    }
                    UpdateFiles({ workspaceId: id, files: newFiles });
                    return newFiles;
                });
            }
            setLoading(false);
            setIsGenerating(false); // Task 3: hide overlay
            setStreamingContent('');
        });

        return () => { clearInterval(intervalId); unsubChunk(); unsubComplete(); };
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

            {/* Task 3: Generation overlay — hides code, shows "Working..." */}
            {isGenerating && (
                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <Loader2Icon className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.3em] animate-pulse">
                        Working...
                    </p>
                </div>
            )}

            {/* Header */}
            <div className='bg-white px-8 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm z-10'>
                <div className="flex items-center gap-6">
                    {/* Task 2: Run button top-left */}
                    <button
                        onClick={handleRun}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        <Play className="h-3.5 w-3.5" />
                        Run
                    </button>
                    <div className="h-4 w-px bg-stone-200" />
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
                    <button onClick={downloadFiles} className="flex items-center gap-2 glass-button-primary py-2 px-4 text-[9px]">
                        <Download className="h-3.5 w-3.5" />
                        Export
                    </button>
                </div>
            </div>

            {/* Task 1: overflow-y-auto on the editor wrapper for scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <SandpackProvider
                    files={files}
                    template="react"
                    theme={proTheme}
                    customSetup={{ dependencies: { ...Lookup.DEPENDANCY }, entry: '/index.js' }}
                    options={{
                        externalResources: ['https://cdn.tailwindcss.com'],
                        bundlerTimeoutSecs: 60,
                        recompileMode: "delayed",
                        recompileDelay: 500,
                        autorun: true,
                    }}
                >
                    <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0, background: 'transparent' }}>
                        {activeTab === 'code' && (
                            <>
                                <SandpackFileExplorer style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.05)' }} />
                                <SandpackCodeEditor
                                    style={{ height: '100%', overflowY: 'auto' }}
                                    showTabs
                                    showLineNumbers
                                    showInlineErrors
                                    wrapContent
                                    closableTabs
                                />
                            </>
                        )}
                        {activeTab === 'preview' && (
                            <div className="flex-1 bg-white relative h-full overflow-hidden">
                                {/* Task 4: Factory iframe — uses buildPreviewHtml output via srcdoc */}
                                {showPreviewPane && previewHtml ? (
                                    <iframe
                                        srcDoc={previewHtml}
                                        title="DOM Preview"
                                        className="w-full h-full border-0"
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                ) : (
                                    <SandpackPreview
                                        style={{ height: '100%', flex: 1 }}
                                        showNavigator={false}
                                        showOpenInCodeSandbox={false}
                                        showRefreshButton={true}
                                        actionsChildren={null}
                                    />
                                )}
                            </div>
                        )}
                        {activeTab === 'structure' && (
                            <div className="flex-1 relative h-full overflow-y-auto">
                                <DOMParserPane files={files} />
                            </div>
                        )}
                    </SandpackLayout>
                </SandpackProvider>
            </div>
        </div>
    );
}

export default CodeView;