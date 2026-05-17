/**
 * Redis Manager for AI stream buffering
 * Handles metrics dispatching for the Diagnostics HUD
 */
import { notificationSystem, EVENTS } from './NotificationSystem';

class MockRedis {
    constructor() {
        this.buffers = new Map();
    }
    async append(key, value) {
        if (!this.buffers.has(key)) this.buffers.set(key, []);
        this.buffers.get(key).push(value);
        return true;
    }
    async get(key) {
        return (this.buffers.get(key) || []).join('');
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
        this.currentOffset = 0;
    }

    isConfigured() {
        return !this.isMock;
    }

    async append(key, chunkStr) {
        if (!chunkStr) return false;

        // Telemetry Calculation
        const batchSize = new Blob([chunkStr]).size;
        this.currentOffset += batchSize;

        // Dispatch to HUD
        notificationSystem.publish(EVENTS.REDIS_METRICS, {
            batchSize: `${batchSize}B`,
            offset: this.currentOffset,
            status: 'streaming'
        });

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

    async flushBuffer(streamId) {
        const key = `stream:${streamId}`;
        let fullText = "";

        if (this.isMock) {
            fullText = await this.redis.get(key);
            await this.redis.del(key);
        } else {
            try {
                const getRes = await fetch(`${this.url}/get/${key}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                const data = await getRes.json();
                fullText = data.result || "";

                await fetch(`${this.url}/del/${key}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
            } catch (error) {
                console.error("REDIS_FLUSH_ERROR:", error);
            }
        }

        // Reset HUD
        this.currentOffset = 0;
        notificationSystem.publish(EVENTS.REDIS_METRICS, {
            batchSize: '0B',
            offset: 0,
            status: 'idle'
        });

        return fullText;
    }
}

export const redisManager = new RedisManager();