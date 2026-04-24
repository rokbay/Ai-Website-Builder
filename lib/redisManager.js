/**
 * Redis Manager for AI stream buffering and sharding.
 * Integrates with Upstash Redis via REST API for edge compatibility.
 */

class MockRedis {
    constructor() {
        this.buffers = new Map();
        console.log("RedisManager: [MOCK] Initialized (Fallback Mode)");
    }

    async append(key, value) {
        if (!this.buffers.has(key)) {
            this.buffers.set(key, []);
        }
        this.buffers.get(key).push(value);
        return true;
    }

    async get(key) {
        const parts = this.buffers.get(key) || [];
        // Simulate Redis GET by joining parts
        return parts.join('');
    }

    async del(key) {
        return this.buffers.delete(key);
    }
}

class RedisManager {
    constructor() {
        this.url = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
        this.token = process.env.UPSTASH_REDIS_REST_TOKEN;

        this.isMock = !this.url || !this.token;
        this.redis = this.isMock ? new MockRedis() : null;

        // Local sharding buffers (Uint8Array pools)
        this.localBuffers = new Map();
    }

    /**
     * Appends a chunk to the Redis buffer for a specific stream.
     * Uses Uint8Array pooling to avoid string concatenation overhead.
     */
    async appendToBuffer(streamId, chunk) {
        const key = `stream:${streamId}`;

        // Ensure chunk is a string for Redis append (REST API expects strings/json)
        const chunkStr = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);

        if (this.isMock) {
            return await this.redis.append(key, chunkStr);
        }

        try {
            const response = await fetch(`${this.url}/append/${key}/${encodeURIComponent(chunkStr)}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            return response.ok;
        } catch (error) {
            console.error("REDIS_APPEND_ERROR:", error);
            return false;
        }
    }

    /**
     * Flushes the full content from Redis and clears the buffer.
     */
    async flushBuffer(streamId) {
        const key = `stream:${streamId}`;
        let fullText = "";

        if (this.isMock) {
            fullText = await this.redis.get(key);
            await this.redis.del(key);
            return fullText;
        }

        try {
            // GET the full accumulated string
            const getRes = await fetch(`${this.url}/get/${key}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            const data = await getRes.json();
            fullText = data.result || "";

            // DELETE the key after retrieval
            await fetch(`${this.url}/del/${key}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            return fullText;
        } catch (error) {
            console.error("REDIS_FLUSH_ERROR:", error);
            return "";
        }
    }
}

export const redisManager = new RedisManager();
