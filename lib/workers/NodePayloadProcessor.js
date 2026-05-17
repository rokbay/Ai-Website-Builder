const { parentPort } = require('worker_threads');

/**
 * Node.js Payload Processor Worker
 * Handles heavy serialization and metrics calculation in an independent thread.
 */

parentPort.on('message', (data) => {
    const { fullText, type } = data;

    if (type === 'PROCESS_METRICS') {
        try {
            // Node-safe byte size calculation
            const size = Buffer.byteLength(fullText, 'utf8');
            
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
