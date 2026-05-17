# Performance Engineering

## 1. Component Memoization & Render Thrashing Mitigation

During high-frequency token streams (e.g., Gemini 2.0 streaming at 50+ tokens per second), naive React state management causes catastrophic "render thrashing," resulting in severe input lag and UI freezing.

To mitigate this, the Bolt Engine relies heavily on granular memoization and decoupled state updates:
- **`MessageItem` Memoization**: Encapsulating individual chat bubbles inside `React.memo` ensures that past messages are not re-rendered during an ongoing stream.
- **Reference Stability**: `useCallback` and `useMemo` strictly enforce referential equality for all event handlers passed to deep trees like `Sandpack` or `ChatView`.

## 2. Dynamic Imports & Bundle Optimization

To achieve a sub-second Time to Interactive (TTI), heavy dependencies are stripped from the main payload:
- **Lazy Hydration**: The `Sandpack` interactive IDE runtime is dynamically imported (`next/dynamic`) without Server-Side Rendering (`ssr: false`). It is only fetched over the wire when the user enters the "Code Generation" UI state.
- **Code Splitting**: Reduces the initial JavaScript bundle size by **30-40%**.

## 3. Runtime Compilation Tuning

The Next.js runtime is configured to optimize module transpilation at build time:
- **SWC Minification**: Replaces Babel with the Rust-based SWC compiler for faster minification.
- **`optimizePackageImports`**: Pre-configures modular imports for heavy libraries (like `lucide-react`) to prevent the entire library bundle from leaking into the client chunk.

## 4. Hardware/Memory Trade-offs

| Decision | Benefit | Trade-off |
|----------|----------|------------|
| In-Memory Stream Buffering | Zero disk I/O latency, perfect for 60fps streaming | Memory footprint increases with massive prompt contexts |
| Debounced Editor Sync | Prevents Sandpack from recompiling on every token | Slight perceptual delay between raw token generation and UI rendering |
| Pub/Sub vs React State | Bypasses React's reconciliation bottleneck | Increases architectural complexity, harder to debug state bugs |
