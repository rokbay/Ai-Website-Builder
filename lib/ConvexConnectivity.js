/**
 * Convex Sharded Connectivity & Connection Builder
 * Implements the Builder Pattern for session initialization
 */

import { notificationSystem, EVENTS, notify } from './NotificationSystem';
import { redisManager } from './redisManager';

/**
 * Represents a sharded session connection
 */
class SessionShard {
    constructor(config) {
        this.config = config; // Fixed: assign config to this
        this.sessionId = config.sessionId;
        this.convexUrl = config.convexUrl;
        this.useRedis = config.useRedis;
        this.localFallback = config.localFallback;
        this.isConnected = false;
        this.lastCheck = null;
    }

    async connect() {
        notify.status(`Initializing Session Shard: ${this.sessionId}`, 'info');

        // Parallel health check
        const checks = [this._checkConvex()];
        if (this.useRedis && redisManager.isConnected) {
            checks.push(this._checkRedis());
        }

        if (this.localFallback && this.config.checker) {
            checks.push(this.config.checker.testConnection().then(res => res.success));
        }

        const results = await Promise.all(checks);
        this.isConnected = results.every(r => r === true);
        this.lastCheck = new Date();

        if (this.isConnected) {
            notify.status(`Session Shard ${this.sessionId} Online`, 'success');
        }

        return this.isConnected;
    }

    async _checkConvex() {
        try {
            const res = await fetch(this.convexUrl, { method: 'HEAD' });
            return res.ok || res.status === 404;
        } catch (e) {
            return false;
        }
    }

    async _checkRedis() {
        return redisManager.isConnected;
    }
}

/**
 * Fluent Builder for Session Connections
 */
export class SessionConnectionBuilder {
    constructor() {
        this.config = {
            sessionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
            convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
            useRedis: false,
            localFallback: false,
            checker: null
        };
    }

    withSessionAuth(sessionId) {
        this.config.sessionId = sessionId;
        return this;
    }

    withConvex(url) {
        this.config.convexUrl = url;
        return this;
    }

    withRedis() {
        this.config.useRedis = redisManager.isConfigured();
        return this;
    }

    withLocalFallback(checker) {
        this.config.localFallback = true;
        this.config.checker = checker;
        return this;
    }

    async build() {
        const shard = new SessionShard(this.config);
        await shard.connect();
        return shard;
    }
}

/**
 * Legacy support for convexConnChecker singleton
 */
class ConvexConnectivityChecker {
    constructor() {
        this.isConnected = false;
        this.convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    }

    async checkConnection() {
        const builder = new SessionConnectionBuilder();
        const shard = await builder
            .withConvex(this.convexUrl)
            .withRedis()
            .build();

        this.isConnected = shard.isConnected;
        return this.isConnected;
    }

    isInitialized() {
        return !!this.convexUrl;
    }

    startHealthChecks(interval = 30000) {
        this._interval = setInterval(() => this.checkConnection(), interval);
    }

    stopHealthChecks() {
        if (this._interval) clearInterval(this._interval);
    }

    getDiagnostics() {
        return {
            isConnected: this.isConnected,
            convexUrl: this.convexUrl ? 'configured' : 'not-configured',
            redisEnabled: redisManager.isConnected
        };
    }
}

export const convexConnChecker = new ConvexConnectivityChecker();
