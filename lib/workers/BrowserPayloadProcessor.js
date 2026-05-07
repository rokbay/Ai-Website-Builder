/**
 * Browser-specific Payload Processor Worker
 * Handles metrics calculation in a Web Worker to keep the UI thread responsive.
 */

self.onmessage = (event) => {
    const { fullText, type } = event.data;

    if (type === 'PROCESS_METRICS') {
        try {
            // Browser-safe byte size calculation
            const size = new Blob([fullText]).size;
            
            self.postMessage({
                success: true,
                metrics: {
                    sizeBytes: size,
                    sizeKB: (size / 1024).toFixed(2),
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            self.postMessage({
                success: false,
                error: error.message
            });
        }
    }
};
