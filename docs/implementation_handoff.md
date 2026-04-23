# Implementation Handoff: Bolt Engine Synthesis Interface

## 1. Overview
The **Bolt Engine** is an elite, spec-driven neural project synthesizer. It leverages a hybrid architecture combining a Next.js frontend, a Convex real-time backend, and an optional .NET bridge for local file system operations.

## 2. Core Architecture

### 2.1 AI Provider Management (`lib/AiProviderManager.js`)
The engine supports multiple AI providers with a "Smart Routing" strategy:
- **Cloud Models (Gemini)**: Requests are routed through Convex Actions (`convex/actions.js`) for persistent streaming and database logging.
- **Local Models (LM Studio)**: Implements **Solution A (Client-Side Direct Routing)**. When selected, the browser performs a direct `fetch` to `http://localhost:1234/v1/chat/completions`. This bypasses cloud latency and avoids CORS/localhost reachability issues from the Convex cloud.

### 2.2 Global Layout & Event Bus
- **Global Mounting**: `SettingsModal.jsx` and `DiagnosticsHUD.jsx` are rendered in `components/custom/ClientLayout.jsx` (which wraps the entire app). This fixes previous orphaned event listener issues.
- **Notification System**: A centralized event bus (`lib/NotificationSystem.js`) manages UI updates, latency tracking, and error reporting across components.

## 3. Design System: "Obsidian & Deep Sea"
The aesthetic has transitioned from "Carbon-Steel" to a seamless, translucent glassmorphism design.

### 3.1 CSS Tokens (`app/globals.css`)
- **Palette**: Deep slate/black background (`#020617`) with cyan (`#00f3ff`) and blue accents.
- **Glassmorphism**: 
  - `.carbon-card`: `bg-surface/60` with `backdrop-blur-3xl`.
  - `.glass-input`: Translucent black backgrounds with subtle inner shadows.
- **Gradients**: Uses radial gradients in the body to create a sense of depth ("Deep Sea" effect).

## 4. Code Changes Summary

| File | Change Type | Purpose |
| :--- | :--- | :--- |
| `app/layout.js` | Modified | Wraps children in `ClientLayout` for global component access. |
| `components/custom/Header.jsx` | Modified | Implements "Bolt Engine" branding and neural status markers. |
| `components/custom/ChatView.jsx` | Modified | Rewritten to use `AiProviderManager` for synthesis requests. |
| `lib/AiProviderManager.js` | **NEW** | Centralized logic for provider switching and direct local fetching. |
| `prompts/system_prompts.js` | **NEW** | Decouples massive system prompts from UI logic. |
| `components/custom/DiagnosticsHUD.jsx`| Modified | Displays real-time IPC traffic and synthesis telemetry. |
| `app/api/enhance-prompt/route.jsx` | Modified | Updated with manual `chatSession` logic for prompt refinement. |

## 5. Technical Directives for Future Refinement
- **Streaming for Local Models**: Currently, the `AiProviderManager` uses non-streaming fetches for LM Studio for stability. Future iterations should implement `ReadableStream` handling for local models.
- **Context Management**: The engine currently passes the full `MessagesContext`. As projects grow, implement a "sliding window" or "summarization" strategy for long-form synthesis.
- **Diagnostics**: Expand the HUD to include a "Local Connection Check" that pings port 1234 to verify LM Studio status.

---
**Status**: Implementation Verified. Blueprints Reverted per user request. Codebase is in "Bolt Engine" production state.
