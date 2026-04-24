/**
 * Verification Script for Redis Sharding and Payload Processing
 */

// Use ESM since the lib files use ESM
import { redisManager } from '../lib/redisManager.js';
import { payloadProcessor } from '../lib/payloadProcessor.js';
import { notificationSystem } from '../lib/NotificationSystem.js';

async function verify() {
    console.log("--- STARTING INTEGRATION VERIFICATION ---");

    const streamId = "test-stream-" + Date.now();
    const testChunks = ["Hello ", "world!", " This is ", "a test payload."];
    const expectedFullText = testChunks.join("");

    console.log(`1. Testing redisManager with streamId: ${streamId}`);
    for (const chunk of testChunks) {
        await redisManager.appendToBuffer(streamId, chunk);
    }

    const flushedText = await redisManager.flushBuffer(streamId);
    console.log(`- Flushed Text: "${flushedText}"`);

    if (flushedText === expectedFullText) {
        console.log("✅ redisManager: Append and Flush successful.");
    } else {
        console.error("❌ redisManager: Append and Flush mismatch!");
        process.exit(1);
    }

    console.log("\n2. Testing payloadProcessor (Worker Threads)");

    // Subscribe to metrics
    let metricsReceived = false;
    notificationSystem.subscribe('ai:payload_metrics', (metrics) => {
        console.log(`- Metrics Received: ${JSON.stringify(metrics)}`);
        metricsReceived = true;
    });

    try {
        const metrics = await payloadProcessor.processMetrics(flushedText);
        console.log(`- Metrics Calculated: sizeBytes=${metrics.sizeBytes}`);

        if (metricsReceived && metrics.sizeBytes > 0) {
            console.log("✅ payloadProcessor: Worker processing and notification successful.");
        } else {
            console.error("❌ payloadProcessor: Metrics not received or invalid.");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ payloadProcessor error:", error);
        process.exit(1);
    }

    console.log("\n--- VERIFICATION COMPLETE ---");
    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
