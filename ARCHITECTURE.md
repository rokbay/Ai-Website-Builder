# System Architecture: Bolt Engine (v2.2.0)

## 1. Integrated Synthesis Pipeline
The system implements a **Strategy-Factory Hybrid** for **Optimistic AI Synthesis**. This ensures that the user interface remains responsive while handling complex, high-latency asynchronous generation tasks.

### 1.1 Core Patterns
- **Optimistic UI Pattern**: Applied in `ChatView.jsx`. The local state is updated immediately upon user input, providing an instant "Optimistic" feedback loop.
- **Strategy Pattern**: Applied in `ProviderFactory.js`. AI models (Gemini, LM Studio) are encapsulated as interchangeable strategies.
- **Factory Pattern**: The `AiProviderManager` acts as a project factory, converting text streams into structured JSON React projects.
- **Command Pattern (Implicit)**: User prompts are treated as synthesis commands that initiate the pipeline.

## 2. Synchronization & Persistence
The engine uses a **Hierarchical State Machine**:
1. **Transient State**: Real-time updates via `NotificationSystem` (Pub/Sub).
2. **Persistent State**: Transactional commits to Convex (L2) upon batch or stream completion.

## 3. Asynchronous Management
- **Abortable Fetch**: Every generation lifecycle is cancellable.
- **Micro-Batching**: Token streams are throttled at the UI layer to maintain 60fps rendering performance.

---
*Technical Authors: The Architect & Antigravity AI*
