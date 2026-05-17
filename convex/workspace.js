import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { api, internal } from './_generated/api';


export const StartAiGeneration = mutation({
    args: {
        workspaceId: v.id('workspace'),
        prompt: v.string(),
        model: v.string(),
        messageIndex: v.number()
    },
    handler: async (ctx, args) => {
        // Lock the UI immediately
        await ctx.db.patch(args.workspaceId, { isStreaming: true });
        
        // Asynchronously schedule the background worker. 
        // This instantly frees the React network stack.
        await ctx.scheduler.runAfter(0, api.actions.StreamAiAction, args);
    }
});

// 2. The Throttled Chunk Writer (Internal = Only accessible by Convex servers)
export const UpdateChunk = internalMutation({
    args: {
        workspaceId: v.id('workspace'),
        messageIndex: v.number(),
        content: v.string()
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) return;
        
        const newMessages = [...workspace.messages];
        if (newMessages[args.messageIndex]) {
            newMessages[args.messageIndex].content = args.content;
            await ctx.db.patch(args.workspaceId, { 
                messages: newMessages,
                lastUpdated: Date.now() 
            });
        }
    }
});
export const CreateWorkspace = mutation({
    args:{
        messages:v.any(),
        projectName:v.optional(v.string()),
    },
    handler:async(ctx,args)=>{
        const workspaceId = await ctx.db.insert('workspace',{
            messages:args.messages,
            projectName:args.projectName,
            createdAt: Date.now()
        });
        return workspaceId;
    }
})

export const DeleteWorkspace = mutation({
    args: {
        workspaceId: v.id('workspace')
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.workspaceId);
    }
});

export const GetWorkspace = query({ 
    args:{
        workspaceId:v.id('workspace'),
        includeFileData:v.optional(v.boolean()),
    },
    handler:async(ctx,args)=>{
        const result = await ctx.db.get(args.workspaceId);
        if (!result) return null;
        if (!args.includeFileData) {
            const { fileData, ...metadata } = result;
            return metadata;
        }
        return result;
    }
})

export const UpdateWorkspace = mutation({
    args:{
        workspaceId:v.id('workspace'),
        messages:v.any(),
        projectName:v.optional(v.string()),
        description:v.optional(v.string()),
    },
    handler:async(ctx,args)=>{
        const patchData = {
            messages:args.messages,
            projectName:args.projectName,
            lastUpdated: Date.now()
        };
        if (args.description !== undefined) {
            patchData.description = args.description;
        }
        const result=await ctx.db.patch(args.workspaceId, patchData);
        return result;
    }
})

export const UpdateFiles = mutation({
    args:{
        workspaceId:v.id('workspace'),
        files:v.any(),
    },
    handler:async(ctx,args)=>{
        const result=await ctx.db.patch(args.workspaceId,{
            fileData:args.files,
            lastUpdated: Date.now()
        });
        return result;
    }
})

// Optimized query - fetch workspace with messages only (no file data by default)
export const GetWorkspaceMetadata = query({
    args:{
        workspaceId:v.id('workspace')
    },
    handler:async(ctx,args)=>{
        const result = await ctx.db.get(args.workspaceId);
        if (!result) return null;
        // Return metadata only, files fetched separately
        return {
            _id: result._id,
            projectName: result.projectName,
            description: result.description,
            messages: result.messages,
            isStreaming: result.isStreaming,
            createdAt: result.createdAt,
            lastUpdated: result.lastUpdated,
            benchmarks: result.benchmarks
        };
    }
})

// Separate query for file data only
export const GetWorkspaceFiles = query({
    args:{
        workspaceId:v.id('workspace')
    },
    handler:async(ctx,args)=>{
        const result = await ctx.db.get(args.workspaceId);
        return result?.fileData || null;
    }
})

// REAL-TIME STREAMING MUTATIONS
export const SetStreamingStatus = mutation({
    args: {
        workspaceId: v.id('workspace'),
        isStreaming: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.workspaceId, { isStreaming: args.isStreaming });
    }
});

export const UpdateStreamingMessage = mutation({
    args: {
        workspaceId: v.id('workspace'),
        messageIndex: v.number(),
        content: v.string(),
        benchmarks: v.optional(v.object({ ttfb: v.number(), duration: v.number() }))
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) return;
        
        const newMessages = [...workspace.messages];
        if (newMessages[args.messageIndex]) {
            newMessages[args.messageIndex].content = args.content;
            
            const patchData = {
                messages: newMessages,
                lastUpdated: Date.now()
            };
            if (args.benchmarks) {
                patchData.benchmarks = args.benchmarks;
            }
            
            await ctx.db.patch(args.workspaceId, patchData);
        }
    }
});

