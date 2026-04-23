# Technical Specification: High-Performance Connectivity Suite (Redis + Worker Threads)

## 1. Goal
Implement a high-performance, sharded connectivity architecture using the **Builder Pattern** for session initialization, **Redis** for stream buffering, and **Worker Threads** for heavy computation. This refactor targets a 90% reduction in Convex database writes and zero-stutter AI streaming.

## 2. Infrastructure & Performance Requirements
### 2.1 V8 Memory Tuning
- **Directive**: Increase heap limit to 8GB.
- **Implementation**: Set `NODE_OPTIONS="--max-old-space-size=8192"` in the deployment environment.

### 2.2 Thread Pool Utilization
- **Engine**: Node.js `worker_threads`.
- **Target Tasks**: Token size calculations, AST serialization, and large payload compression.
- **Benefit**: Prevents event loop blocking to ensure smooth SSE chunk delivery.

### 2.3 Memory Management (Buffer Pooling)
- **Directive**: Stop string concatenation for streaming content.
- **Implementation**: Use `Uint8Array` or `Buffer` pools for incoming stream chunks. Convert to UTF-8 only during UI synchronization or final flush.

## 3. Component Refactor
### 3.1 Notification System (Strict Singleton)
- **Pattern**: Strict Singleton using `Object.freeze`.
- **Storage**: Use `Map` for high-frequency subscriber lookups.
- **Events**: `REDIS_CONNECTED`, `REDIS_METRICS`.

### 3.2 Session Connection Builder
- **Pattern**: Fluent Builder.
- **Capabilities**:
  - `.withConvex(url)`: Base cloud sync.
  - `.withRedis(url, token)`: High-frequency stream sharding.
  - `.withLocalFallback(checker)`: Integrated LM Studio/Localhost racing logic.
  - `.withSessionAuth(id)`: Per-user session isolation.

### 3.3 Redis Stream Buffer & Flush Strategy
- **Logic**: Tokens `APPEND` to Redis key `stream_buffer:{sessionId}`.
- **Flush**: Read full buffer on `done` event, trigger ONE Convex mutation, delete Redis key.

## 4. Verification
- **FPS Analysis**: Ensure 60FPS during 100+ tokens/sec synthesis.
- **Convex Metrics**: Mutation count per message must be exactly 1.
- **Redis TTL**: Verify keys expire after 1 hour (Passive PLRU).
