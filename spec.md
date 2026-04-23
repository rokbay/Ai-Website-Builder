# Technical Specification: Critical Hotfix (Hydration & Icons)

## 1. Goal
Fix immediate runtime crashes (Hydration mismatch and ReferenceError) and enforce the "Obsidian" baseline theme.

## 2. Requirements
### 2.1 Hydration Fix
- **Target**: `app/layout.js`
- **Action**: Add `suppressHydrationWarning` to the `<html>` tag to handle client-side theme injection.
- **Theme**: Set `<body>` classes to `bg-[#020617] text-white antialiased`.

### 2.2 Missing Icon Fix
- **Target**: `components/custom/DiagnosticsHUD.jsx`
- **Issue**: `ReferenceError: Zap is not defined`.
- **Action**: Import `Zap` from `lucide-react`.

## 3. Verification
- App should load without hydration warnings in console.
- Diagnostics HUD should render correctly with the `Zap` icon visible.
