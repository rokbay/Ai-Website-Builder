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

    useEffect(() => {
        const GetWorkspaceData = async () => {
            if (id) {
                const result = await convex.query(api.workspace.GetWorkspace, {
                    workspaceId: id
                });
                if (result) {
                    setMessages(result.messages || []);
                    setInitialFileData(result.fileData);
                }
                setDataLoaded(true);
            }
        };
        GetWorkspaceData();
    }, [id, convex, setMessages]);

    return (
        <div className="min-h-screen bg-gray-950 relative overflow-hidden">
            <BackgroundPattern />
            <div className='relative z-10 p-10'>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-10'>
                    <ChatView />
                    <div className='col-span-3'>
                        <CodeView initialFileData={initialFileData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;