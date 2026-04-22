# Technical Specification: Bolt Engine (SDD Synthesis Interface)

## 1. Goal
Transition the project into **Bolt Engine**—the world's first real-time Spec-Driven Synthesis Interface. The interface must be high-performance, local-first, and feature a seamless, premium design.

## 2. Requirements

### 2.1 AI Provider Layer
- **Local Model Support:** Integrate OpenAI-compatible API endpoints for Ollama/LM Studio.
- **Provider Switching:** Allow the user to toggle between `gemini-2.0-flash` and `local-llama-3` via the UI.
- **Extreme Prompting:** Decouple massive system prompts from the UI components. State should be managed in a `/prompts` library.

### 2.2 Performance & Connectivity
- **Clean API Protocols:** The `ConnectivityChecker` currently waits sequentially for 4 strategies. This must be refactored to a **Parallel Racing** strategy (first responder wins).
- **Redundant Configs:** Eliminate duplicate configuration objects in `AiModel.jsx` and `ConnectivityChecker.js`.

### 2.3 GUI Overhaul
- **Design:** Seamless "Obsidian & Deep Sea" aesthetic (Tailwind 4 / Lucide). Move away from dark metallic looks to a more fluid, translucent glassmorphism design.
- **Branding:** Include "Bolt Engine — The World's First Real-Time Spec-Driven Synthesis Interface" prominently in the header.
- **Settings Modal:** Ensure the `SettingsModal` is correctly rendered in the root layout and functional.
  - Current IPC Traffic (WebMessageBridge).
  - Selected AI Model latency.
  - Active Connectivity Strategy.

## 3. Architecture
Existing WPF Wrapper (WebView2) will manage the local model process (checking if Ollama is running) and pass that state to the Next.js frontend via the Bridge.

## 4. Verification Plan
- **Latency Check:** Connectivity check must complete in <200ms when localhost is healthy.
- **AI Switch Test:** Verify code generation works after switching provider mid-session.
- **Accessibility:** 100/100 Lighthouse score on the new GUI.
