# Implementation Plan: Bolt Engine Synthesis Interface

This plan details the technical steps to achieve the objectives defined in `spec.md`.

## Phase 1: AI Provider Abstraction
- [ ] Create `/prompts` folder and migrate "Extreme Prompting" logic from `AiModel.jsx`.
- [ ] Implement `AiProviderManager.js` to handle switching between Gemini (Convex) and LM Studio (Client-Side Direct).
- [ ] Update `ChatView.jsx` to detect "LM Studio" and perform direct `fetch` to `localhost:1234`, bypassing Convex for local generation.

## Phase 2: Performance Triage
- [ ] Refactor `ConnectivityChecker.js`: 
    - Replace sequential `try/catch` loops with `Promise.any()` for parallel strategy testing.
    - Implement a 500ms timeout for localhost strategies to prevent UI hang.
- [ ] Optimize `WebMessageBridge.js` with batching for large code generation updates.

## Phase 3: GUI & Debugging Overhaul
- [ ] Implement Global Theme Provider (Obsidian & Deep Sea / Seamless Design).
- [ ] Render `SettingsModal` in `app/layout.js` or root level to fix icon click logic.
- [ ] Apply "Bolt Engine" branding and "First of its Kind" statements in `Header.jsx`.
- [ ] Create `DiagnosticsHud` component:
    - Live feed of `WebMessage` IPC logs.
    - AI Response token/second counter.
    - Strategy selector (Manual override for testing).
- [ ] Refactor `Dashboard` to support the new "Production Debugging" layout.

## Phase 4: Verification
- [ ] Manual test of Local Model generation (Verify browser console shows direct fetch to :1234).
- [ ] Network tab audit to ensure connectivity check is <200ms.
