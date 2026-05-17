# Bolt Engine Architecture

## 1. Integrated Synthesis Pipeline

The Bolt Engine implements a distributed streaming architecture designed to synchronize local UI environments with remote LLM token streams. The core problem it solves is handling complex, high-latency asynchronous generation tasks while keeping the user interface completely unblocked.

### 1.1 Optimistic Locking & Rendering
To mask network traversal latency during cold starts, the system implements an **Optimistic UI Pattern**:
- Upon dispatching a prompt payload, the local UI state is immediately patched with a transient layout lock.
- A background scheduler is spun up in Convex to handle the actual remote RPC to Gemini/LM Studio.
- The UI listens exclusively for the incoming pub/sub token stream, treating the optimistic lock as the final layout container.

### 1.2 Strategy-Factory Synthesis
The AI generation pipeline relies on a strict separation of concerns via a **Strategy-Factory Hybrid**:
- **Strategy Pattern (`ProviderFactory`)**: Abstraction layer allowing the engine to hot-swap between local execution runtimes (LM Studio via raw HTTP streams) and edge runtimes (Gemini Cloud via SSE).
- **Factory Pattern (`AiProviderManager`)**: Ingests raw unstructured token streams and compiles them into valid, AST-parsable React application states on the fly.

## 2. Hierarchical State Machine

Relying entirely on a traditional database for a streaming application causes critical I/O bottlenecks. The Bolt Engine shards state into two distinct layers:

### L1: Transient State (In-Memory Pub/Sub)
- Tokens are streamed directly into memory.
- The `NotificationSystem` broadcasts these tokens at 60fps to active parser listeners.
- Avoids hitting the database for every single sub-string token update, which would exhaust connection pools.

### L2: Persistent State (Convex)
- Handles the "Commit" phase of the transaction.
- Once a logical chunk of the AST is completed (or the stream finalizes), a batched update is pushed to Convex.
- Acts as the single source of truth for hard page refreshes and multi-client synchronization.

## 3. Asynchronous Concurrency Management

- **Micro-Batching**: Token streams are inherently unpredictable in length. The Engine throttles React layout updates by micro-batching incoming tokens before committing them to the virtual DOM.
- **Race Condition Safety**: Implements `AbortController` primitives across the pipeline to ensure orphaned streams are instantly terminated if a user interrupts the synthesis lifecycle.
