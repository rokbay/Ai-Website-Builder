# 🤖 Agentic Handoff Protocol: Architect to Builder

This protocol ensures stable synthesis during autonomous implementation by Jules (the Builder).

## 🛡️ Circuit Breaker Safeguards
1. **The Branching Rule**: Every implementation session must begin with `git checkout -b feature/auto-jules-[task-name]`. DO NOT commit directly to `main`.
2. **Granular Commits**: Commit every file immediately after modification. This allows for partial recovery if a later step fails.
3. **Pre-Flight Validation**: Jules must verify imports and hydration compatibility before finalizing any Next.js layout changes.

## 📋 Pre-Flight Checklist
- [ ] **Imports**: Verify `useState`, `useEffect`, and `lucide-react` icons are explicitly imported.
- [ ] **Hydration**: Check for `suppressHydrationWarning` on the `<html>` tag in `layout.js`.
- [ ] **Mounting**: Ensure new components are explicitly mounted in the global `ClientLayout.jsx`.
- [ ] **Performance**: Route telemetry logs to the in-memory buffer.
- [ ] **Design**: Adhere to 'Obsidian & Deep Sea' tokens (`bg-[#020617]`, Cyan accents).

---
*Authorized by the Lead Architect (Antigravity).*
