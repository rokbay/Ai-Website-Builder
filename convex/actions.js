// convex/actions.js
import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

// =====================================================================
// 1 & 4. FILE HANDLING & AI CONTEXT GENERATION (RAG Ingestion)
// Takes massive code/text, chunks it, gets Gemini embeddings, and saves.
// =====================================================================
export const ProcessWorkspaceFiles = action({
  args: {
    workspaceId: v.id('workspace'),
    fileContent: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Heavy Compute: Chunk the file text (e.g., 1000 characters per chunk)
      const chunks = args.fileContent.match(/.{1,1000}/g) || [];
      const apiKey = process.env.GEMINI_API_KEY;

      // 2. Fetch Embeddings for each chunk from Gemini (External API call)
      for (const chunk of chunks) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text: chunk }] }
            })
        });
        
        const data = await response.json();
        const embeddingVector = data.embedding?.values;

        // 3. Save to Convex Database via Internal Mutation (convex/ai_context.js file!!!)
        if (embeddingVector) {
            await ctx.runMutation(internal.ai_context.saveChunk, {
                workspaceId: args.workspaceId,
                text: chunk,
                embedding: embeddingVector
            });
        }
      }
      return { success: true, chunksProcessed: chunks.length };
    } catch (error) {
        console.error("Context Chunking Failed:", error);
        return { success: false, error: error.message };
    }
  },
});

// =====================================================================
// 4. AI CONTEXT RETRIEVAL (Vector Search)
// Call this from your Next.js route before generating code to give the AI context.
// =====================================================================
export const SearchWorkspaceContext = action({
  args: {
    workspaceId: v.id('workspace'),
    userQuery: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get embedding for the user's question
    const apiKey = process.env.GEMINI_API_KEY;
    const embedRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: args.userQuery }] }
        })
    });
    
    const embedData = await embedRes.json();
    const queryVector = embedData.embedding?.values;

    if (!queryVector) return [];

    // 2. Perform Native Convex Vector Search
    const results = await ctx.vectorSearch("documentChunks", "by_embedding", {
        vector: queryVector,
        limit: 5,
        filter: (q) => q.eq("workspaceId", args.workspaceId), // Only search this workspace
    });

    // 3. Fetch the actual text from the search results
    const relevantChunks = await Promise.all(
        results.map(async (result) => {
            const doc = await ctx.runQuery(internal.ai_context.getChunkById, { id: result._id });
            return doc.text;
        })
    );

    return relevantChunks; // Feed this string array directly into your Gemini Prompt!
  }
});

// =====================================================================
// 3. STREAM & NODE HEALTH CHECKS
// Safe external API pinging without freezing the client UI
// =====================================================================
export const CheckExternalNodeHealth = action({
    args: {
        nodeUrl: v.string(), // e.g., 'http://127.0.0.1:1234/v1/models' (LM Studio)
    },
    handler: async (ctx, args) => {
        try {
            // Using AbortController to enforce a strict 2-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(args.nodeUrl, { 
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            return { isOnline: response.ok, status: response.status };
        } catch (error) {
            return { isOnline: false, error: 'Node Unreachable' };
        }
    }
});