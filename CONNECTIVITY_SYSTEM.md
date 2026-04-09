# Connectivity & Notification System Documentation

## Overview

The AI Website Builder now includes a comprehensive **pub/sub notification system** and **multi-strategy connectivity checker** that replaces manual status updates with event-driven architecture.

## Key Components

### 1. NotificationSystem (Pub/Sub Pattern)
**Location:** `lib/NotificationSystem.js`

A centralized event system that enables loose coupling between components via publish-subscribe pattern.

```javascript
import { notificationSystem, EVENTS, notify } from '@/lib/NotificationSystem';

// Subscribe to events
notificationSystem.subscribe(EVENTS.STATUS_UPDATE, (data) => {
    console.log('Status:', data.message);
});

// Publish events
notificationSystem.publish(EVENTS.SERVER_READY, { status: 'healthy' });

// Or use convenience methods
notify.status('Server is ready', 'success');
notify.error('Connection failed', error);
```

#### Supported Events
- `connectivity:check` - Connection check initiated
- `connectivity:success` - Connection established
- `connectivity:failed` - Connection failed
- `convex:connected` - Convex backend connected
- `convex:disconnected` - Convex backend disconnected
- `server:starting` - Server starting up
- `server:ready` - Server ready to accept requests
- `server:error` - Server error occurred
- `status:update` - General status update
- `loading:start` - Loading started
- `loading:end` - Loading completed
- `error:occurred` - Error event
- `warning:occurred` - Warning event
- `api:request` - API request made
- `api:response` - API response received
- `api:error` - API error occurred

### 2. ConnectivityChecker (Multiple Strategies)
**Location:** `lib/ConnectivityChecker.js`

Automatically tries multiple connection strategies in order until one succeeds.

#### Built-in Strategies

1. **LocalhostHTTP** - Connects to `http://localhost:3000` (Next.js dev server)
2. **ConvexDirect** - Direct connection to Convex backend
3. **WebSocket** - WebSocket connection for real-time updates
4. **Cache** - Offline cache fallback (memory-based)

```javascript
import { connChecker } from '@/lib/ConnectivityChecker';

// Start connection with fallbacks
const result = await connChecker.testConnection();

// Make requests with automatic strategy selection
const response = await connChecker.makeRequest('/api/enhance-prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'Hello' })
});

// Start health checks
connChecker.startHealthChecks(30000); // Every 30 seconds

// Get current connection info
const info = connChecker.getConnectionInfo();
// Returns: { isConnected: true, strategy: 'LocalhostHTTP', baseUrl: 'http://localhost:3000' }
```

### 3. ConvexConnectivity
**Location:** `lib/ConvexConnectivity.js`

Specific connectivity checker for Convex backend services.

```javascript
import { convexConnChecker } from '@/lib/ConvexConnectivity';

// Check Convex connection
const isConnected = await convexConnChecker.checkConnection();

// Get diagnostics
const diagnostics = convexConnChecker.getDiagnostics();
// Returns: { isConnected, convexUrl, lastCheckTime, retryCount, maxRetries }

// Start automatic health checks
convexConnChecker.startHealthChecks(60000); // Every 60 seconds

// Check specific function
await convexConnChecker.testFunction('list_workspaces');
```

### 4. Notification UI Components
**Location:** `components/custom/NotificationComponents.jsx`

React components for displaying notifications and connection status.

```javascript
import { NotificationDisplay, ConnectionIndicator } from '@/components/custom/NotificationComponents';

// In your main layout
export default function Layout({ children }) {
    return (
        <div>
            <NotificationDisplay /> {/* Shows status and notification queue */}
            <ConnectionIndicator /> {/* Shows connection status badge */}
            {children}
        </div>
    );
}
```

### 5. Connectivity Hooks
**Location:** `lib/useConnectivity.js`

React hooks for managing connectivity in components.

```javascript
import { useInitializeConnectivity, useConnectedRequest, useConvexStatus } from '@/lib/useConnectivity';

// Initialize all connectivity checks
export default function App() {
    useInitializeConnectivity();

    return <YourApp />;
}

// Make requests with fallback strategies
function MyComponent() {
    const { makeRequest, getConnectionInfo } = useConnectedRequest();

    const handleRequest = async () => {
        const response = await makeRequest('/api/enhance-prompt', {
            method: 'POST',
            body: JSON.stringify({ prompt: 'test' })
        });
    };

    return <button onClick={handleRequest}>Send Request</button>;
}

// Monitor Convex status
function ConvexStatus() {
    const { isConnected, getDiagnostics } = useConvexStatus();

    return <div>{isConnected ? 'Convex Connected' : 'Convex Offline'}</div>;
}
```

## .NET Launcher Integration

The .NET WPF launcher communicates with the web app via WebView2 JavaScript interop.

### How it Works

1. **Launcher Startup:** MainWindow.xaml.cs starts the Next.js server and waits for it to be ready
2. **Navigation:** WebView2 navigates to `http://localhost:3000`
3. **Bridge Setup:** A notification bridge is injected into the loaded page
4. **Events Flow:** The .NET app publishes server events (health checks, etc.) through JavaScript execution

### Key Events Published by .NET

```csharp
// In MainWindow.xaml.cs
PublishNotification("server:health", "{\"status\":\"healthy\"}");
PublishNotification("server:ready", "{\"status\":\"responding\"}");
PublishNotification("server:warning", "{\"reason\":\"...\"}");
PublishNotification("server:error", "{\"reason\":\"...\"}");
```

### Alternative Localhost Connection Methods

The system supports multiple ways to connect to the local server:

1. **HTTP/REST** (Primary)
   - Used by default for API calls
   - Supports long-polling for real-time updates if WebSocket unavailable

2. **WebSocket** (Real-time)
   - For live updates and bidirectional communication
   - Falls back to HTTP if WebSocket fails

3. **Convex Backend** (Production)
   - Direct connection to Convex services
   - Used when local server is unavailable
   - Provides persistent data storage and real-time updates

4. **Memory Cache** (Offline)
   - Last resort fallback
   - Serves cached responses when all online strategies fail

## Diagnostics & Troubleshooting

### Check Connection Status

```javascript
import { connChecker } from '@/lib/ConnectivityChecker';
import { convexConnChecker } from '@/lib/ConvexConnectivity';

// Get current connection
const connInfo = connChecker.getConnectionInfo();
console.log('Connection:', connInfo);

// Get Convex diagnostics
const convexDiags = convexConnChecker.getDiagnostics();
console.log('Convex Status:', convexDiags);

// Get event history
const history = notificationSystem.getHistory();
console.log('Last 100 events:', history);
```

### .NET Launcher Health Check

The launcher now includes an API health endpoint:

```
GET /api/health
```

Response:
```json
{
  "timestamp": "2026-04-09T12:00:00Z",
  "status": "healthy",
  "checks": {
    "api": { "status": "ok", "endpoint": "/api/enhance-prompt" },
    "convex": { "status": "configured", "url": "set" },
    "geministream": { "status": "configured" }
  },
  "environment": {
    "nodeEnv": "development",
    "nextVersion": "15.1.11",
    "platform": "server"
  }
}
```

## Best Practices

### 1. Subscribe to Events Instead of Polling

```javascript
// ❌ Avoid: Polling
setInterval(async () => {
    const status = await fetch('/api/status');
}, 5000);

// ✅ Good: Event-driven
notificationSystem.subscribe(EVENTS.SERVER_READY, () => {
    console.log('Server is ready!');
});
```

### 2. Use Connection Strategies

```javascript
// ❌ Avoid: Hard-coded localhost
await fetch('http://localhost:3000/api/data');

// ✅ Good: Use fallback strategies
const response = await connChecker.makeRequest('/api/data');
```

### 3. Clean Up Subscriptions

```javascript
// ✅ Good: Unsubscribe in cleanup
useEffect(() => {
    const unsub = notificationSystem.subscribe(EVENTS.STATUS_UPDATE, handler);
    return () => unsub(); // Cleanup
}, []);
```

### 4. Handle Offline Mode

```javascript
const useOfflineAware = () => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const unsub = notificationSystem.subscribe(EVENTS.CONNECTIVITY_FAILED, () => {
            setIsOnline(false);
        });

        return unsub;
    }, []);

    return isOnline;
};
```

## Configuration

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### .NET Launcher Configuration

Edit `Views/MainWindow.xaml.cs`:

```csharp
private const string LOCALHOST = "http://localhost:3000";
private const int LAUNCH_DELAY = 3000;
```

## Migration Guide

If you have existing code using direct status updates:

### Before (Manual Updates)
```javascript
// Old approach
async function startServer() {
    document.getElementById('status').textContent = 'Starting...';
    // ... start logic
    document.getElementById('status').textContent = 'Ready';
}
```

### After (Event-Driven)
```javascript
// New approach
async function startServer() {
    notify.status('Starting...', 'info');
    // ... start logic
    notify.status('Ready', 'success');
}
```

## Future Enhancements

- [ ] Service Worker integration for offline support
- [ ] Persistent event logging to localStorage
- [ ] WebSocket upgrade for real-time collaboration
- [ ] Automatic retry with exponential backoff
- [ ] Network quality detection
- [ ] Device notification support (browser notifications)
- [ ] Performance monitoring and metrics

## Support

For issues or questions:
1. Check the event history: `notificationSystem.getHistory()`
2. Monitor subscriber count: `notificationSystem.getSubscriberCount()`
3. Review .NET launcher status messages in MainWindow
4. Check `/api/health` endpoint for server status
