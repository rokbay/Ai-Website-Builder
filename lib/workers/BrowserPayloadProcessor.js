/**
 * Browser-specific Payload Processor Worker
 * Handles metrics calculation in a Web Worker to keep the UI thread responsive.
 */

self.onmessage = (event) => {
    const { payload, type, id } = event.data;

    if (type === 'PROCESS_METRICS') {
        try {
            const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const size = new Blob([str]).size;
            
            self.postMessage({
                id,
                type: 'PROCESS_METRICS',
                result: {
                    byteSize: size,
                    estimatedTokens: Math.ceil(str.length / 4),
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            self.postMessage({
                id,
                type: 'ERROR',
                error: error.message
            });
        }
    } else if (type === 'SERIALIZE_JSON') {
        try {
            self.postMessage({
                id,
                type: 'SERIALIZE_JSON',
                result: JSON.stringify(payload)
            });
        } catch (error) {
            self.postMessage({
                id,
                type: 'ERROR',
                error: error.message
            });
        }
    }
};
