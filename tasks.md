# Tasks: Critical Runtime Hotfixes

## 🤖 PRE-FLIGHT CHECKLIST
- [ ] **The Import Rule:** Verify and explicitly import all components, hooks, and icons (`lucide-react`).
- [ ] **The Hydration Rule:** Ensure `suppressHydrationWarning` is on the `<html>` tag.
- [ ] **The Mounting Rule:** No orphaned components.
- [ ] **The Performance Rule:** Route high-frequency logs to the in-memory buffer.
- [ ] **Design System Adherence:** Strictly follow 'Obsidian & Deep Sea' tokens.
- [ ] **Granular Commits**: Commit after every file modification.

## Implementation Tasks
- [ ] **[MODIFY] [layout.js](file:///app/layout.js)**: Add hydration warning suppression and baseline theme classes.
- [ ] **[MODIFY] [DiagnosticsHUD.jsx](file:///components/custom/DiagnosticsHUD.jsx)**: Fix missing `Zap` icon import.
