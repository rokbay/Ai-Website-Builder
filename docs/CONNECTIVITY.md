# Connectivity & IPC Bridge Architecture

## 1. Multi-Strategy Connectivity Layer

The Bolt Engine employs a robust, fault-tolerant connectivity system to ensure uninterrupted real-time streaming and state synchronization. A multi-strategy checker dynamically evaluates and falls back across different network boundaries based on availability, latency, and runtime environment.

### Fallback Hierarchy
The connectivity system automatically attempts the following connection strategies in order:

1. **HTTP/REST Polling (Primary)**: Connects directly to the Next.js runtime backend. Utilized when WebSockets are unavailable or to proxy requests to LLM providers.
2. **Convex Direct (L2 Persistence)**: Real-time sync connection to the Convex backend. Responsible for the authoritative state and optimistic locking.
3. **WebSocket (Real-Time)**: Preferred mode for live DOM mutations and high-frequency streaming events.
4. **Memory Cache**: Offline cache fallback. Returns transient state if all external boundaries fail.

## 2. Event-Driven Pub/Sub System

To prevent render thrashing within the React UI during high-frequency token streams, the system utilizes an in-memory Pub/Sub architecture (`lib/NotificationSystem.js`).

### Render Bottleneck Mitigation
React's virtual DOM reconciliation is too slow for per-token state updates during a 60fps AI stream. The Pub/Sub layer completely decouples the streaming pipeline from the React component lifecycle:

- **Stream Ingestion**: Tokens are buffered and broadcasted via `EVENTS.AI_STREAM_CHUNK`.
- **Component Subscriptions**: Only components that strictly require the token (e.g., `CodeView` parser) subscribe to the event. The main layout is bypassed, preventing unnecessary re-renders.

### Event Taxonomy
- `connectivity:check` / `connectivity:success` / `connectivity:failed`
- `convex:connected` / `convex:disconnected`
- `server:ready` / `server:error`
- `status:update` / `loading:start`
- `api:request` / `api:response`

## 3. Cross-Runtime Inter-Process Communication (IPC)

When deployed via the Edge Runtime or local `.NET WPF` launcher, the Bolt Engine utilizes an embedded WebView2 runtime to facilitate IPC.

### WebMessage Architecture
Instead of relying on unstable `localhost` HTTP polling, the `.NET` container and the React frontend communicate via synchronous WebMessages.
- Eliminates CORS overhead.
- Reduces network latency to zero for local bridging.
- Enables the .NET host to execute native OS operations while pushing real-time status events directly into the Javascript Pub/Sub layer.

### Flow
1. **.NET Host** initializes the local server and injects an IPC bridge script into the WebView2 instance.
2. **React Frontend** attaches a global listener for `window.chrome.webview.addEventListener('message')`.
3. The host publishes raw JSON payloads (e.g., `{"event": "server:ready", "status": "responding"}`) which are instantly forwarded to the internal `NotificationSystem`.
