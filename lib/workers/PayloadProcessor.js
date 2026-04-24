/**
 * Payload Processor Worker
 * Offloads heavy sync tasks from the main thread to ensure smooth UI/Streaming
 */

const { parentPort } = require('worker_threads');

/**
 * Calculate byte size of any payload
 */
function calculateByteSize(data) {
    try {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return Buffer.byteLength(str, 'utf8');
    } catch (e) {
        return 0;
    }
}

/**
 * Mock Tokenizer (Rough estimate: 4 chars per token)
 * In production, this would use a real tokenizer like tiktoken
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Heavy AST/JSON Serialization
 */
function processPayload(payload) {
    const byteSize = calculateByteSize(payload);
    const estimatedTokens = estimateTokens(typeof payload === 'string' ? payload : JSON.stringify(payload));

    return {
        byteSize,
        estimatedTokens,
        timestamp: Date.now()
    };
}

// Listen for messages from the main thread
parentPort.on('message', (message) => {
    const { type, payload, id } = message;

    try {
        switch (type) {
            case 'PROCESS_METRICS':
                const metrics = processPayload(payload);
                parentPort.postMessage({ id, type: 'METRICS_RESULT', result: metrics });
                break;

            case 'SERIALIZE_JSON':
                const serialized = JSON.stringify(payload);
                parentPort.postMessage({ id, type: 'SERIALIZATION_RESULT', result: serialized });
                break;

            case 'PING':
                parentPort.postMessage({ id, type: 'PONG' });
                break;

            default:
                parentPort.postMessage({ id, type: 'ERROR', error: `Unknown task type: ${type}` });
        }
    } catch (error) {
        parentPort.postMessage({ id, type: 'ERROR', error: error.message });
    }
});
