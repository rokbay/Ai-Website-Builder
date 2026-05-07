# Refactor Tasks: Streaming Bug Fixes & GUI Overhaul

## 🎨 Phase 1: GUI Overhaul (Web1/Web2 Integration)
- [ ] Implement Framer Motion transitions in `Header.jsx`, `ChatView.jsx`, and `CodeView.jsx`.
- [ ] Refactor `Header.jsx` to feature seamless glassmorphism and condense the Intelligence Node.
- [ ] Refactor `ChatView.jsx` messages to use clean Bento-box styling.

## 🐛 Phase 2: Pipeline Bug Fixes
- [ ] Update `EVENTS.AI_STREAM_CHUNK` payload in `AiProviderManager.js` to separate `delta` and `fullContent`.
- [ ] Modify `CodeView.jsx` to correctly append only the `delta` to prevent crash-inducing duplication.
- [ ] Bind `ChatView.jsx` to listen to the `EVENTS.AI_STREAM_CHUNK` stream and update live.

---

# Refactor Tasks: Redis Sharding & High-Performance Synthesis

## 🏗️ Phase 1: Integration Gap Closure
- [ ] Integrate Redis Stream Buffer in `app/api/enhance-prompt/route.jsx`
- [ ] Integrate Redis Stream Buffer in `app/api/ai-chat/route.jsx`
- [ ] Integrate Redis Stream Buffer in `app/api/gen-ai-code/route.jsx`
- [ ] Refactor `convex/actions.js` to use Redis "Single-Flush" logic
- [ ] Plug `PayloadProcessor` worker into all API routes for metrics

## 🧪 Phase 2: Stress Testing & Verification
- [ ] Obtain Upstash Redis credentials from USER
- [ ] Verify `npm run dev` and `npx convex dev` connectivity
- [ ] Monitor DiagnosticsHUD during full synthesis stream
- [ ] Validate 8GB Heap Limit under high load
- [ ] Confirm zero-stutter streaming on UI

## ✅ Completed
- [x] Singleton Hardening (Object.freeze)
- [x] Builder Pattern Implementation (SessionConnectionBuilder)
- [x] Infrastructure Setup (RedisManager, PayloadProcessor)
- [x] Memory Tuning (.env configuration)
