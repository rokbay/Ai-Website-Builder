// convex/ai_context.js
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveChunk = internalMutation({
    args: {
        workspaceId: v.id('workspace'),
        text: v.string(),
        embedding: v.array(v.number())
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("documentChunks", {
            workspaceId: args.workspaceId,
            text: args.text,
            embedding: args.embedding
        });
    }
});