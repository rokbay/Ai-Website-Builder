import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        picture: v.string(),
        uid: v.string()
    }),
    workspace:defineTable({
        // Workspace metadata
        projectName: v.optional(v.string()),
        name: v.optional(v.string()), // Deprecated: use projectName instead
        description: v.optional(v.string()),
        createdAt: v.optional(v.number()),
        
        // Chat/messages
        messages: v.any(),
        
        // Generated file data
        fileData: v.optional(v.any()), // Object with file paths as keys
        fileName: v.optional(v.string()), // Individual file being edited
        
        // Streaming state
        isStreaming: v.optional(v.boolean()),
        lastUpdated: v.optional(v.number()),
    })
});