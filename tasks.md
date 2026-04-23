# Tasks: Payload Size Telemetry

## 🤖 PRE-FLIGHT CHECKLIST
- [ ] **The Import Rule:** Verify imports in `AiProviderManager.js` and `DiagnosticsHUD.jsx`.
- [ ] **The Hydration Rule:** N/A (Client components).
- [ ] **The Mounting Rule:** Ensure HUD remains mounted in `ClientLayout`.
- [ ] **The Performance Rule:** Use `useMemo` or debounced updates for the HUD if necessary.
- [ ] **Design System Adherence:** Use `text-cyan-400` for the new metric label.
- [ ] **Granular Commits**: Commit after every file modification.

## Implementation Tasks
- [ ] **[MODIFY] [NotificationSystem.js](file:///lib/NotificationSystem.js)**: Add `PAYLOAD_METRICS` event.
- [ ] **[MODIFY] [AiProviderManager.js](file:///lib/AiProviderManager.js)**: Implement size calculation and event dispatch.
- [ ] **[MODIFY] [DiagnosticsHUD.jsx](file:///components/custom/DiagnosticsHUD.jsx)**: Add display row and event listener.
