# Technical Specification: AI-Website-Builder Enhancement

## 1. Goal
Transition the AI-Website-Builder project into a high-performance, local-first development tool with a production-grade interface and diagnostics.

## 2. Requirements

### 2.1 AI Provider Layer
- **Local Model Support:** Integrate OpenAI-compatible API endpoints for Ollama/LM Studio.
- **Provider Switching:** Allow the user to toggle between `gemini-2.0-flash` and `local-llama-3` via the UI.
- **Extreme Prompting:** Decouple massive system prompts from the UI components. State should be managed in a `/prompts` library.

### 2.2 Performance & Connectivity
- **Clean API Protocols:** The `ConnectivityChecker` currently waits sequentially for 4 strategies. This must be refactored to a **Parallel Racing** strategy (first responder wins).
- **Redundant Configs:** Eliminate duplicate configuration objects in `AiModel.jsx` and `ConnectivityChecker.js`.

### 2.3 GUI Overhaul
- **Design:** Modern "Carbon-Steel" aesthetic (Tailwind 4 / Lucide).
- **Debugging:** Integrated side-HUD showing:
  - Current IPC Traffic (WebMessageBridge).
  - Selected AI Model latency.
  - Active Connectivity Strategy.

## 3. Architecture
Existing WPF Wrapper (WebView2) will manage the local model process (checking if Ollama is running) and pass that state to the Next.js frontend via the Bridge.

## 4. Verification Plan
- **Latency Check:** Connectivity check must complete in <200ms when localhost is healthy.
- **AI Switch Test:** Verify code generation works after switching provider mid-session.
- **Accessibility:** 100/100 Lighthouse score on the new GUI.
