import { Worker } from 'worker_threads';
import path from 'path';
import { notificationSystem } from './NotificationSystem.js';

/**
 * Payload Processor Client
 * Main-thread wrapper for the PayloadProcessor worker.
 */
class PayloadProcessor {
    constructor() {
        this.workerPath = path.resolve(process.cwd(), 'lib/workers/PayloadProcessor.js');
    }

    /**
     * Processes metrics for a full AI response.
     * Offloads calculation to a worker thread.
     */
    processMetrics(fullText) {
        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(this.workerPath);

                worker.on('message', (result) => {
                    if (result.success) {
                        // Broadcast metrics to the system (e.g., for DiagnosticsHUD)
                        notificationSystem.publish('ai:payload_metrics', result.metrics);
                        resolve(result.metrics);
                    } else {
                        reject(new Error(result.error));
                    }
                    worker.terminate();
                });

                worker.on('error', (err) => {
                    reject(err);
                    worker.terminate();
                });

                worker.postMessage({
                    type: 'PROCESS_METRICS',
                    fullText
                });
            } catch (error) {
                console.error("PAYLOAD_PROCESSOR_INIT_ERROR:", error);
                reject(error);
            }
        });
    }
}

export const payloadProcessor = new PayloadProcessor();
