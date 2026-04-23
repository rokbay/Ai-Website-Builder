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
