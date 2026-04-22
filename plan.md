# Implementation Plan: AI-Website-Builder Overhaul

This plan details the technical steps to achieve the objectives defined in `spec.md`.

## Phase 1: AI Provider Abstraction
- [ ] Create `/prompts` folder and migrate "Extreme Prompting" logic from `AiModel.jsx`.
- [ ] Implement `AiProviderManager.js` to handle switching between Gemini and Local (Ollama) endpoints.
- [ ] Update `app/api/gen-ai-code/route.jsx` to use the bridge-selected provider.

## Phase 2: Performance Triage
- [ ] Refactor `ConnectivityChecker.js`: 
    - Replace sequential `try/catch` loops with `Promise.any()` for parallel strategy testing.
    - Implement a 500ms timeout for localhost strategies to prevent UI hang.
- [ ] Optimize `WebMessageBridge.js` with batching for large code generation updates.

## Phase 3: GUI & Debugging Overhaul
- [ ] Implement Global Theme Provider (Carbon/Steel).
- [ ] Create `DiagnosticsHud` component:
    - Live feed of `WebMessage` IPC logs.
    - AI Response token/second counter.
    - Strategy selector (Manual override for testing).
- [ ] Refactor `Dashboard` to support the new "Production Debugging" layout.

## Phase 4: Verification
- [ ] Manual test of Local Model generation.
- [ ] Network tab audit to ensure connectivity check is <200ms.
