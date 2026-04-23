# Engineering Log: Fixes & Technical Debt Remediation

## 1. Security Vulnerability: API Key Leakage
- **Issue**: The Gemini API key was stored in `.env.local` with the `NEXT_PUBLIC_` prefix.
- **Risk**: Static embedding of sensitive secrets into the client-side JavaScript bundle, exposing the key to any browser user.
- **Fix**: Removed `NEXT_PUBLIC_` prefix. Migrated the key to a server-side only variable (`GEMINI_API_KEY`) and synchronized it with the Convex Cloud environment using `npx convex env set`.

## 2. Synthesis Engine: ReferenceError (`reader` is not defined)
- **Issue**: `ChatView.jsx` attempted to use a `reader` object for manual streaming that was never initialized or was deleted during a previous refactor.
- **Impact**: Generation stalled immediately, showing only the initial template without streaming the AI's code updates.
- **Fix**: Removed the broken local streaming loop. Integrated the frontend directly with the `StreamAiAction` Convex action. The frontend now relies on Convex's reactive database subscriptions to stream content updates every 150ms.

## 3. Environment Configuration: Missing Convex Context
- **Issue**: The `.env.local` file was accidentally overwritten, losing the `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`.
- **Fix**: Successfully re-initialized the environment via `npx convex dev` through a remote PowerShell process, restoring connectivity to the `quirky-goose-237` deployment.

## 4. Resolved Issue: Settings Modal Disconnect
- **Issue**: The Settings icon in `Header.jsx` dispatched an event, but the modal was not rendered.
- **Fix**: Mounted `<SettingsModal />` in `ClientLayout.jsx` for global availability.

## 5. Implementation Handoff
A comprehensive documentation of the **Bolt Engine** overhaul is available in:
- [implementation_handoff.md](file:///C:/Users/ZYAD/Desktop/Ai-Website-Builder/docs/implementation_handoff.md)
