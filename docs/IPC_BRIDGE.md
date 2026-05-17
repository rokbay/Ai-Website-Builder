# IPC Bridge Architecture

## 1. Overview
The Bolt Engine features a hybrid deployment architecture. While it natively runs in the cloud (Vercel/Convex), it also ships with a self-contained `.NET Common Language Runtime (CLR)` host application. This native WPF shell embeds a WebView2 Chromium container and provides a low-latency execution environment for local inference models.

## 2. The Connectivity Problem
In a hybrid desktop/web architecture, the frontend (React) and the host shell (.NET) must communicate to report server health, manage port assignments, and handle process telemetry.

Relying on traditional HTTP polling against `localhost` presents several failure modes:
- **Port Contention**: If port 3000 is occupied, the host cannot guarantee successful communication without excessive port scanning.
- **Latency**: HTTP polling introduces artificial latency into the synchronization loop.
- **CORS Constraints**: Modern browser security protocols block unauthenticated localhost REST calls from arbitrary origins.

## 3. WebMessage IPC Bridge
To solve this, the Bolt Engine implements an Inter-Process Communication (IPC) bridge using native **WebView2 `WebMessage` APIs**.

### Sequence Flow
1. **.NET Host Initialization**: The `MainWindow.xaml.cs` spins up the Next.js process in the background.
2. **WebView Injection**: The host dynamically injects a JavaScript bridge into the embedded browser before navigation completes.
3. **Event Broadcasting**: The host uses `ExecuteScriptAsync` to publish raw JSON payloads directly into the `window` object.
    ```csharp
    PublishNotification("server:ready", "{\"status\":\"responding\"}");
    ```
4. **React Aggregation**: A global event listener on the frontend intercepts the `message` event.
    ```javascript
    window.chrome.webview.addEventListener('message', (event) => {
        notificationSystem.publish(event.data.type, event.data.payload);
    });
    ```

## 4. Advantages
- **Zero Latency**: Bypasses the network stack entirely for host-to-client communication.
- **Synchronous Event Loop**: The `.NET` host pushes state mutations exactly when they occur, instantly updating the frontend's transient Pub/Sub state without waiting for the next HTTP polling tick.
- **Process Auto-Management**: If the Next.js process crashes, the `.NET` host instantly publishes a `server:error` WebMessage, automatically rendering a fallback UI in React without needing an explicit heartbeat timeout.
