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
