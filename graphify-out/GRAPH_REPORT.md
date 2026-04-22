# Graph Report - Ai-Website-Builder  (2026-04-22)

## Corpus Check
- 87 files · ~30,812 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 226 nodes · 200 edges · 12 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `MainWindow` - 20 edges
2. `WebMessageBridge` - 15 edges
3. `ConvexConnectivityChecker` - 9 edges
4. `EnvironmentValidator` - 9 edges
5. `ConnectivityChecker` - 8 edges
6. `NotificationSystem` - 7 edges
7. `GeminiService` - 6 edges
8. `CacheStrategy` - 5 edges
9. `AIProviderFactory` - 5 edges
10. `POST()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `ClientInitializer()` --calls--> `useInitializeConnectivity()`  [INFERRED]
  app\ClientInitializer.jsx → lib\useConnectivity.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (3): AiWebsiteBuilder.Views, MainWindow, Window

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (2): ConvexConnectivityChecker, NotificationSystem

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (4): CacheStrategy, ConvexDirectStrategy, LocalhostHttpStrategy, WebSocketStrategy

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (3): AiWebsiteBuilder.Services, WebMessage, WebMessageBridge

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (4): AiWebsiteBuilder.Services, CommandResult, DiagnosticResult, EnvironmentValidator

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (2): ConnectivityChecker, GET()

### Community 6 - "Community 6"
Cohesion: 0.27
Nodes (2): AIProviderFactory, POST()

### Community 7 - "Community 7"
Cohesion: 0.32
Nodes (2): AiWebsiteBuilder.Services, GeminiService

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (2): ClientInitializer(), useInitializeConnectivity()

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (3): AiWebsiteBuilder, App, Application

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (2): AiWebsiteBuilder, App

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (2): AiWebsiteBuilder.Views, MainWindow

## Knowledge Gaps
- **10 isolated node(s):** `AiWebsiteBuilder`, `AiWebsiteBuilder`, `AiWebsiteBuilder.Views`, `AiWebsiteBuilder.Services`, `DiagnosticResult` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 1`** (19 nodes): `ConvexConnectivityChecker`, `.checkConnection()`, `.constructor()`, `.getConvexUrl()`, `.getDiagnostics()`, `.isInitialized()`, `.startHealthChecks()`, `.stopHealthChecks()`, `.testFunction()`, `ConvexConnectivity.js`, `NotificationSystem.js`, `NotificationSystem`, `.clearHistory()`, `.constructor()`, `.getHistory()`, `.getSubscriberCount()`, `.publish()`, `.subscribe()`, `.handleNotification()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (11 nodes): `route.jsx`, `.request()`, `ConnectivityChecker`, `.constructor()`, `.getConnectionInfo()`, `.makeRequest()`, `.registerStrategy()`, `.startHealthChecks()`, `.stopHealthChecks()`, `.testConnection()`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (10 nodes): `route.jsx`, `route.jsx`, `route.jsx`, `ProviderFactory.js`, `AIProviderFactory`, `.attemptProvider()`, `.getGoogleStream()`, `.getLocalStream()`, `.getStream()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (8 nodes): `AiWebsiteBuilder.Services`, `GeminiService`, `.ExtractTextChunk()`, `.FindEnvFile()`, `.Initialize()`, `.ResolveApiKey()`, `.StreamCodeAsync()`, `GeminiService.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (6 nodes): `ClientInitializer.jsx`, `ClientInitializer()`, `useConnectivity.js`, `useConnectedRequest()`, `useConvexStatus()`, `useInitializeConnectivity()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (5 nodes): `AiWebsiteBuilder`, `App`, `.InitializeComponent()`, `.Main()`, `App.g.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (4 nodes): `AiWebsiteBuilder.Views`, `MainWindow`, `.InitializeComponent()`, `MainWindow.g.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WebMessageBridge` connect `Community 3` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 5` to `Community 3`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `CacheStrategy` connect `Community 2` to `Community 5`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `AiWebsiteBuilder`, `AiWebsiteBuilder`, `AiWebsiteBuilder.Views` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._