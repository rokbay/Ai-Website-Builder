# Technical Specification: Payload Size Telemetry

## 1. Goal
Implement real-time measurement and display of the AI request payload size to prevent context window overflow and avoid throttling.

## 2. Requirements
### 2.1 Payload Calculation
- **Metric**: Calculate the byte size of the `messages` array using `new Blob([JSON.stringify(messages)]).size`.
- **Trigger**: Every time a synthesis request is prepared (before `fetch`).

### 2.2 Telemetry Dispatch
- **Event**: Dispatch a `PAYLOAD_METRICS` event via the `notificationSystem`.
- **Data**: Include `byteSize` and `estimatedTokens` (Size / 4 as a rough heuristic).

### 2.3 UI Integration
- **Component**: `DiagnosticsHUD.jsx`.
- **Display**: Add a "Context Payload" metric showing the size in KB/MB (e.g., `42.5 KB`).
- **Threshold Alerts**: Highlight the metric in yellow if > 20 KB and red if > 30 KB (configurable baseline for safety).

## 3. Verification
- HUD should update its value immediately before the AI starts typing.
- Network tab in DevTools should show request payload sizes roughly matching the HUD metrics.
