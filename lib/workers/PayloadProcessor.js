const { parentPort } = require('worker_threads');

/**
 * Payload Processor Worker
 * Handles heavy serialization and metrics calculation off the main thread.
 */

parentPort.on('message', (data) => {
    const { fullText, type } = data;

    if (type === 'PROCESS_METRICS') {
        try {
            // Calculate size in bytes
            const size = Buffer.byteLength(fullText, 'utf8');

            // In a real scenario, we might do heavy AST parsing or JSON validation here
            // For now, we'll focus on the payload metrics requirement

            parentPort.postMessage({
                success: true,
                metrics: {
                    sizeBytes: size,
                    sizeKB: (size / 1024).toFixed(2),
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            parentPort.postMessage({
                success: false,
                error: error.message
            });
        }
    }
});
