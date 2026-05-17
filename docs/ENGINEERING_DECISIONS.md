# Engineering Decisions & Rationale

This document serves as an architectural review log outlining the critical decisions made during the development of the Bolt Engine, specifically focusing on distributed constraints, IPC bridging, and performance trade-offs.

## 1. Local-First IPC over WebMessage vs. HTTP Polling

### The Problem
Deploying a hybrid desktop/web application (.NET WPF shell wrapping a Next.js frontend) introduced significant inter-process communication hurdles. Initially, the .NET host polled the local Next.js server via HTTP REST to verify server health. This caused excessive port scanning overhead, CORS configuration nightmares, and noticeable latency.

### The Decision
We migrated to a native **IPC Bridge using WebView2 `WebMessage` APIs**.

### The Rationale
- **Zero Latency**: Bypasses the network stack entirely.
- **Security**: No open localhost HTTP ports are required for the host to communicate with the embedded client.
- **Event-Driven**: The .NET host pushes JSON events directly into the `window.chrome.webview` object, which the React frontend instantly routes into the internal Pub/Sub `NotificationSystem`.

## 2. In-Memory Pub/Sub over React Context

### The Problem
Passing high-frequency AI streaming tokens (50+ tokens per second) through a global React Context provider caused catastrophic render thrashing. Every single token addition triggered a full Virtual DOM reconciliation tree walk, freezing the browser thread.

### The Decision
We decoupled the streaming layer entirely by implementing a transient **Pub/Sub Notification System**.

### The Rationale
- **Targeted Subscriptions**: Only the specific component tasked with parsing the token stream (e.g., the `CodeView` AST parser) subscribes to `EVENTS.AI_STREAM_CHUNK`.
- **Main Thread Unblocking**: The rest of the layout (sidebar, chat history, header) remains completely ignorant of the active stream, maintaining 60fps interactivity.

## 3. L1 Transient Buffering over Per-Token Database Writes

### The Problem
Initially, every streamed token was written directly to the Convex database to ensure real-time synchronization across multi-device sessions. This instantly exhausted connection pools and triggered Convex rate limits.

### The Decision
Implemented an **L1/L2 Architectural Split**.

### The Rationale
- **L1 (Transient)**: Incoming tokens are aggregated into an in-memory string buffer (`redisManager` simulation/local string concatenation).
- **L2 (Persistent)**: Only when a logical completion boundary is hit (e.g., an entire file generation finishes) is the payload committed to Convex via a bulk patch. This reduces database writes by ~99%.

## 4. Edge Runtime vs Standard Serverless

### The Problem
Generating an entire multi-file React application via Gemini 2.0 Flash takes between 20 to 60 seconds. Vercel's standard Serverless functions enforce a strict 10-to-15-second timeout, severing the connection mid-generation.

### The Decision
The `app/api/ai-chat/route.jsx` was explicitly migrated to the **Edge Runtime** (`export const runtime = 'edge'`).

### The Rationale
- **Streaming Response Support**: The Edge Runtime supports unbounded `ReadableStream` returns.
- **Connection Keep-Alive**: Prevents Vercel's proxy from prematurely killing the generation pipeline, allowing the engine to successfully compile large structured payloads.
