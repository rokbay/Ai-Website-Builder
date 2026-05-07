"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, useState, useContext } from 'react';
import { useConvex } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { MessagesContext } from '@/context/MessagesContext';

const ChatView = dynamic(() => import('@/components/custom/ChatView'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-full" />
});

const CodeView = dynamic(() => import('@/components/custom/CodeView'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-full" />
});

const BackgroundPattern = React.memo(() => (
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_400px_at_50%_300px,#3b82f625,transparent)]" />
    </div>
));

BackgroundPattern.displayName = 'BackgroundPattern';

const Workspace = () => {
    const { id } = useParams();
    const convex = useConvex();
    const { setMessages } = useContext(MessagesContext);
    const [initialFileData, setInitialFileData] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [workspaceMetadata, setWorkspaceMetadata] = useState(null);

    // Single fetch: get metadata and files separately (optimized with new queries)
    useEffect(() => {
        const GetWorkspaceData = async () => {
            if (id) {
                try {
                    // Fetch metadata first (smaller payload)
                    const metadata = await convex.query(api.workspace.GetWorkspace, {
                        workspaceId: id,
                        includeFileData: false,
                    });
                    
                    if (metadata) {
                        setWorkspaceMetadata(metadata);
                        setMessages(metadata.messages || []);
                    }

                    // Fetch file data separately after metadata is loaded
                    const files = await convex.query(api.workspace.GetWorkspace, {
                        workspaceId: id,
                        includeFileData: true,
                    });
                    
                    if (files?.fileData) {
                        setInitialFileData(files.fileData);
                    }
                } catch (error) {
                    console.error('Error fetching workspace:', error);
                }
                setDataLoaded(true);
            }
        };
        GetWorkspaceData();
    }, [id, convex, setMessages]);

    return (
        <div className="h-screen bg-stone-50 relative overflow-hidden flex flex-col font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-100/50 via-transparent to-transparent blur-3xl pointer-events-none" />

            <div className='relative z-10 flex-1 overflow-hidden flex flex-col'>
                <div className='flex flex-1 overflow-hidden'>
                    {/* Chat Sidebar */}
                    <aside className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-stone-200 bg-white/80 backdrop-blur-xl flex flex-col shadow-sm z-20">
                        <ChatView />
                    </aside>

                    {/* Main Code/Preview Area */}
                    <main className='flex-1 overflow-hidden bg-transparent flex flex-col relative'>
                        <CodeView initialFileData={initialFileData} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Workspace;