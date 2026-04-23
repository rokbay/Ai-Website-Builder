# ⚖️ THE SPEC-DRIVEN CONSTITUTION (Bolt Engine Edition)

This document formalizes the immutable principles governing the development of the Bolt Engine.

## ARTICLE I: SPECIFICATIONS AS THE SOURCE OF TRUTH
- **Intent Over Implementation**: Every change begins with an evolution of the specification (`spec.md`).
- **Blueprints Mandatory**: No code is generated without an approved `plan.md` and `tasks.md`.

## ARTICLE II: ARCHITECTURAL GATES
1. **Library-First**: New features must be encapsulated in modular libraries.
2. **CLI-First**: All logic must be verifiable via text-based IPC.
3. **Test-First**: Implementation code requires pre-existing, failing tests.

## ARTICLE III: THE AGENTIC HANDOFF (CIRCUIT BREAKER)
- **Branch Isolation**: All autonomous synthesis (Jules) must occur on `feature/auto-jules-` branches.
- **Granular Commits**: Commit every file modification immediately.
- **Pre-Flight Checklist**: Mandatory validation of imports, hydration, and design tokens.

## 📋 PRE-FLIGHT CHECKLIST
- [ ] **Imports**: Verify `useState`, `useEffect`, and `lucide-react` icons.
- [ ] **Hydration**: `suppressHydrationWarning` on root `<html>`.
- [ ] **Mounting**: Explicitly mount in `ClientLayout.jsx`.
- [ ] **Performance**: In-memory buffers for high-frequency logs.
- [ ] **Design**: Adhere to 'Obsidian & Deep Sea' tokens (`bg-[#020617]`, Cyan accents).

---
*Authorized by the Lead Architect (Antigravity).*
