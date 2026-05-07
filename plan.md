# Implementation Plan: Streaming Pipeline Fix & Web1/Web2 GUI Overhaul

## Phase 1: Fix Streaming Pipeline Bugs
- [ ] Fix `AiProviderManager.js`: Update `EVENTS.AI_STREAM_CHUNK` to broadcast `{ delta: data.chunk, full: fullContent }`.
- [ ] Fix `CodeView.jsx`: Read the `delta` chunk from the event instead of concatenating the accumulated string, preventing editor crashes.
- [ ] Fix `ChatView.jsx`: Subscribe to `EVENTS.AI_STREAM_CHUNK` to live-update the streaming output rather than waiting for completion.

## Phase 2: GUI Redesign
- [ ] Overhaul `Header.jsx`: Implement glassmorphism (web1) with a minimal, dark-mode styling. Move "Intelligence Node" to a cleaner modal or pill.
- [ ] Overhaul `ChatView.jsx`: Implement Bento-box aesthetics (web2) for chat bubbles, soft rounded borders, and dynamic message entry animations.
- [ ] Overhaul `CodeView.jsx`: Refine tab selectors to match the seamless design language. Install `framer-motion` if required.

---

# Implementation Plan: Redis Sharding, Builder Pattern & Memory Tuning

## Phase 1: Core System Hardening
- [ ] Refactor `lib/NotificationSystem.js`:
  - Implement `Object.freeze` Singleton.
  - Map-based subscriber management.
  - Export `redisMetrics` telemetry helpers.

## Phase 2: Sharded Connectivity (Builder Pattern)
- [ ] Refactor `lib/ConvexConnectivity.js`:
  - Implement `SessionShard` and `SessionConnectionBuilder`.
  - Fold `ConnectivityChecker` logic into the `.withLocalFallback()` builder method.
- [ ] Modify `lib/useConnectivity.js`:
  - Update hook to utilize the fluent builder.

## Phase 3: Redis Stream & Buffer Pooling
- [ ] Setup `lib/redisManager.js`.
- [ ] Implement `Buffer` pooling for AI streams to replace string concatenation.
- [ ] Integrate the "Single-Flush" Convex strategy.

## Phase 4: Threaded Offloading & Environment
- [ ] Implement `lib/workers/PayloadProcessor.js` using `worker_threads`.
- [ ] Offload AST/JSON serialization to the worker pool.
- [ ] Update `.env` with `NODE_OPTIONS="--max-old-space-size=8192"`.

## Phase 5: UI & Diagnostics
- [ ] Implement localized `DiagnosticsHUD.jsx` for isolated Redis metrics re-renders.
- [ ] Verify 60FPS UI performance during high-frequency synthesis.
