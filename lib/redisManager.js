/**
 * Redis Manager for high-frequency stream sharding and hot context management
 * Uses Upstash Redis for serverless-friendly connectivity
 */

import { Redis } from '@upstash/redis';
import { notificationSystem, EVENTS, notify } from './NotificationSystem';

class RedisManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.url = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
        this.token = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;

        // Performance metrics
        this.metrics = {
            reads: 0,
            writes: 0,
            latency: 0,
            activeStreams: 0
        };

        // Initialize if credentials exist
        if (this.url && this.token) {
            this.init();
        }
    }

    /**
     * Initialize Redis client
     */
    init() {
        try {
            this.client = new Redis({
                url: this.url,
                token: this.token,
            });
            this.isConnected = true;
            notify.redisConnected({ url: this.url });
            this._startMetricsBroadcast();
        } catch (error) {
            console.error('Redis initialization failed:', error);
            this.isConnected = false;
            notify.error('Redis initialization failed', error);
        }
    }

    /**
     * Get hot context using Pseudo Least Recently Used (PLRU) logic
     * Strategy: We use a sorted set where score is the timestamp
     * @param {string} sessionId - Unique session identifier
     */
    async getHotContext(sessionId) {
        if (!this.isConnected) return null;

        const start = Date.now();
        try {
            const key = `context:hot:${sessionId}`;
            const context = await this.client.get(key);

            // Update "Last Used" timestamp (PLRU)
            if (context) {
                await this.client.expire(key, 3600); // 1 hour TTL
                this.metrics.reads++;
            }

            this.metrics.latency = Date.now() - start;
            return context;
        } catch (error) {
            console.error('Error fetching hot context:', error);
            return null;
        }
    }

    /**
     * Stream Buffer: Append chunk to Redis
     * @param {string} streamId - Unique stream identifier
     * @param {Uint8Array|string} chunk - Data chunk
     */
    async appendToBuffer(streamId, chunk) {
        if (!this.isConnected) return;

        const start = Date.now();
        try {
            const key = `stream_buffer:${streamId}`;

            // If it's a Uint8Array, convert to string for Redis (standard Upstash compat)
            const data = chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : chunk;

            await this.client.append(key, data);
            await this.client.expire(key, 300); // 5 min TTL for active streams

            this.metrics.writes++;
            this.metrics.latency = Date.now() - start;
            this.metrics.activeStreams = Math.max(this.metrics.activeStreams, 1);
        } catch (error) {
            console.error('Error appending to Redis buffer:', error);
        }
    }

    /**
     * Flush Buffer: Read full content and delete key
     * Targeted to reduce Convex writes to exactly ONE per message
     * @param {string} streamId - Unique stream identifier
     */
    async flushBuffer(streamId) {
        if (!this.isConnected) return null;

        const start = Date.now();
        try {
            const key = `stream_buffer:${streamId}`;
            const fullContent = await this.client.get(key);

            if (fullContent) {
                await this.client.del(key);
                this.metrics.reads++;
                this.metrics.writes++; // For del
            }

            this.metrics.latency = Date.now() - start;
            return fullContent;
        } catch (error) {
            console.error('Error flushing Redis buffer:', error);
            return null;
        }
    }

    /**
     * Broadcast metrics to Diagnostics HUD
     */
    _startMetricsBroadcast() {
        setInterval(() => {
            if (this.isConnected) {
                notificationSystem.publish(EVENTS.REDIS_METRICS, {
                    ...this.metrics,
                    timestamp: Date.now()
                });
            }
        }, 2000); // Every 2 seconds
    }

    /**
     * Static check for environment configuration
     */
    static isConfigured() {
        return !!(process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL &&
                  process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN);
    }
}

// Export singleton instance
export const redisManager = new RedisManager();
