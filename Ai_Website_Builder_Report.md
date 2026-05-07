# AI Website Builder - Architectural & Diagnostic Report

## 1. Diagnostic Report: Gemini API Call Failures

### The Error
While the Convex database connects perfectly and the application launches without issues, the Gemini AI API fails to trigger for code generation and prompts. 

### The Root Cause
The root cause of this issue stems from an **Environment Variable Misconfiguration**. 
Next.js distinguishes between server-side and client-side environment variables. Any environment variable exposed to the client must be prefixed with `NEXT_PUBLIC_`. 

1. **The Setup Script (`setup-env.bat`)**: The script creates an `.env.local` file and prompts the user to add `GEMINI_API_KEY`.
2. **The Implementations (`configs/AiModel.jsx` and `lib/ai/ProviderFactory.js`)**: These files (used heavily for generation workflows like `app/api/gen-ai-code/route.jsx`) attempt to load the API key using `process.env.NEXT_PUBLIC_GEMINI_API_KEY`.
3. **The Mismatch**: Because the `.env.local` file only contains `GEMINI_API_KEY`, the variable `process.env.NEXT_PUBLIC_GEMINI_API_KEY` resolves to `undefined`. This results in the API call failing silently or throwing a configuration error under the hood.

*Note: The `SettingsModal.jsx` UI (via the `.NET` bridge) correctly saves both `GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY`, but because manual configuration or the `setup-env.bat` script was used, the public variable was omitted.*

### Proposed Solution
*As requested, implementations have not been touched. To resolve this without altering code, simply update your `.env.local` to include:*
```env
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

---

## 2. Design Patterns & Architectural Choices

The project utilizes robust software engineering patterns to ensure high performance and loose coupling.

### A. Factory & Strategy Patterns (`ProviderFactory.js`)
- **Pattern Used**: Factory Method & Strategy.
- **Choice/Rationale**: Allows seamless switching between Cloud Models (Gemini via Google API) and Local Models (LM Studio / Ollama). The factory encapsulates the instantiation logic, meaning the rest of the application doesn't need to know *how* to connect to a specific model, only that it needs a stream.

### B. Facade & Manager Patterns (`AiProviderManager.js`)
- **Pattern Used**: Facade.
- **Choice/Rationale**: The `AiProviderManager` acts as an orchestrator. It hides the complexities of making API calls, managing Redux/Redis cache shards, and publishing telemetry events, exposing a simple `getResponse` method to the application.

### C. Observer / Pub-Sub Pattern (`NotificationSystem.js`)
- **Pattern Used**: Publish-Subscribe.
- **Choice/Rationale**: In heavy React applications, relying purely on React State for high-frequency updates (like streaming AI tokens) causes severe render lag. The Pub-Sub system allows the application to fire events (`EVENTS.AI_STREAM_CHUNK`) that bypass the React batching cycle, instantly updating the UI for a buttery-smooth typing effect.

### D. Multi-Tiered Architecture (L1 / L2 Caching)
- **Design Choice**: The application uses a Two-Tier data preservation mechanism.
- **Rationale**: 
  - **L1 (Redis/Upstash)**: Fire-and-forget, high-speed chunk appending. Used to maintain state mid-stream.
  - **L2 (Convex DB)**: Acts as the absolute source of truth. Once a stream completes, the entire conversation checkpoint is flushed to Convex.

### E. Edge Computing Pattern
- **Design Choice**: Next.js API Routes (`app/api/ai-chat/route.jsx`) are designated with `export const runtime = 'edge';`.
- **Rationale**: Traditional serverless functions timeout after 10-15 seconds. Generative AI streams can take minutes. Edge runtimes circumvent these cold-start and timeout limitations by running lightweight V8 isolates.

### F. Hybrid Application Architecture
- **Design Choice**: Embedding Next.js within a **.NET WPF Desktop Application** using WebView2.
- **Rationale**: Gives the app OS-level capabilities (like the `window.webMessageBridge` for `.env` management), native memory management, and debugging capabilities via the CLR, while maintaining a modern React-based UI.

---

## 3. History of Errors Encountered & Solutions

Throughout the development lifecycle, the following architectural challenges were resolved:

1. **Serverless Timeout Disconnects**:
   - *Error*: AI generations over 10 seconds dropped connections.
   - *Solution*: Migrated API routes from standard Node.js runtime to Edge runtime (`runtime = 'edge'`).
2. **UI Thread Blocking (Lag during streaming)**:
   - *Error*: Updating React state character-by-character crashed the browser.
   - *Solution*: Implemented the Pub/Sub `NotificationSystem` to directly mutate DOM references or use transient state for streaming text.
3. **Connectivity Fragility**:
   - *Error*: App broke completely if Convex was unreachable.
   - *Solution*: Developed a **Multi-Strategy Connectivity Checker**. It attempts LocalhostHTTP -> ConvexDirect -> WebSockets -> In-Memory Cache in order, ensuring offline resilience.
4. **Port Collisions**:
   - *Error*: .NET Launcher crashed when trying to start Next.js if port 3000 was active.
   - *Solution*: Added `IsPortInUse` detection via `IPGlobalProperties` in C# to attach to existing Next.js instances gracefully instead of crashing.
5. **Slow Initial Load Times**:
   - *Error*: Large bundle sizes causing blank screens.
   - *Solution*: Leveraged Next.js dynamic imports (`next/dynamic`) for massive components like `CodeView` and `ChatView`, paired with `useCallback` and `memo` to prevent cascading re-renders.
