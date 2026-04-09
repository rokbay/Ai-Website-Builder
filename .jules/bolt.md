
## 2025-05-15 - Decoupling AI Streaming from Global Context
**Learning:** Updating global context (MessagesContext) on every streaming chunk (multiple times per second) causes massive performance degradation when heavy sibling components (like CodeView with Sandpack) are present.
**Action:** Use local component state for the "typing" effect in the chat and update the global context only once when the stream is finalized. This keeps the rest of the UI responsive during generation.

## 2025-05-15 - Redundant Workspace Fetching
**Learning:** Components in the workspace often independently query Convex for the same workspace data on mount.
**Action:** Lift the workspace query to the parent `Workspace` component and distribute data via props or context to ensure single-fetch efficiency.
