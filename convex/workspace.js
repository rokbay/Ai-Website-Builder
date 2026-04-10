import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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
    },
    handler:async(ctx,args)=>{
        const result=await ctx.db.patch(args.workspaceId,{
            messages:args.messages,
            projectName:args.projectName,
            lastUpdated: Date.now()
        });
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
            lastUpdated: result.lastUpdated
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

