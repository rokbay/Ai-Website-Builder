import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        picture: v.string(),
        uid: v.string()
    }),
    workspace: defineTable({
        // Workspace metadata
        projectName: v.optional(v.string()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        createdAt: v.optional(v.number()),
        
        messages: v.any(),
        
        
        fileData: v.optional(v.any()), 
        fileName: v.optional(v.string()), 
     
        isStreaming: v.optional(v.boolean()),
        lastUpdated: v.optional(v.number()),
    }),
    
    // =========================================================
    // L2 AI CONTEXT ENGINE: Vector Store for RAG Pipeline
    // =========================================================
    documentChunks: defineTable({
        workspaceId: v.id('workspace'),
        text: v.string(),
        embedding: v.array(v.number()), // The AI vector representation
    }).vectorIndex("by_embedding", {
        vectorField: "embedding",
        dimensions: 768, // Gemini embedding dimensions
        filterFields: ["workspaceId"], // Allows fast filtering by workspace
    }),
});