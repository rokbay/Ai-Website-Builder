# Implementation Plan: Payload Size Telemetry

## Phase 1: Telemetry Logic
- [ ] Modify `lib/AiProviderManager.js`:
  - Implement a helper function `calculatePayloadSize(messages)`.
  - In `generateLocalResponse` and `generateCloudResponse`, calculate the size and dispatch a `PAYLOAD_METRICS` event.

## Phase 2: HUD Integration
- [ ] Modify `components/custom/DiagnosticsHUD.jsx`:
  - Listen for the `PAYLOAD_METRICS` event.
  - Update local state `contextSize`.
  - Add a new status row to the "Synthesis" group: `Context: {size} KB`.

## Phase 3: Event Bus Update
- [ ] Modify `lib/NotificationSystem.js`:
  - Add `PAYLOAD_METRICS` to the `EVENTS` enum.

## Phase 4: Verification
- [ ] Run the app and trigger a synthesis request.
- [ ] Confirm HUD displays the correct payload size.
