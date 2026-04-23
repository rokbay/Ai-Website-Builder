# Tasks: High-Performance Connectivity & Memory Refactor

## 🤖 PRE-FLIGHT CHECKLIST
- [ ] **The Singleton Rule:** `Object.freeze(notificationSystem)` - Verify address stability.
- [ ] **The Builder Rule:** Use `SessionConnectionBuilder` - No monolithic initialization.
- [ ] **The Buffer Rule:** Use `Uint8Array/Buffer` pools for streams - No string `+=`.
- [ ] **The Thread Rule:** Offload serialization to `worker_threads`.
- [ ] **The Memory Rule:** Verify `--max-old-space-size=8192` is set in `.env`.
- [ ] **Granular Commits**: Commit after every file modification.

## Implementation Tasks
- [ ] **[MODIFY] [NotificationSystem.js](file:///lib/NotificationSystem.js)**: Strict Singleton + Map subscribers.
- [ ] **[MODIFY] [ConvexConnectivity.js](file:///lib/ConvexConnectivity.js)**: Implement Fluent Builder.
- [ ] **[MODIFY] [useConnectivity.js](file:///lib/useConnectivity.js)**: Hook refactor.
- [ ] **[NEW] [DiagnosticsHUD.jsx](file:///components/custom/DiagnosticsHUD.jsx)**: Localized Redis metrics display.
- [ ] **[NEW] [lib/redisManager.js](file:///lib/redisManager.js)**: Upstash integration & Flush logic.
- [ ] **[NEW] [lib/workers/PayloadProcessor.js](file:///lib/workers/PayloadProcessor.js)**: Worker pool for offloading.
