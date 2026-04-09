/**
 * Next.js API Route for Checking Build and Server Health
 * Provides diagnostic information about the application state
 */

export async function GET(request) {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {
                api: {
                    status: 'ok',
                    endpoint: '/api/enhance-prompt',
                    method: 'POST',
                },
                convex: {
                    status: process.env.NEXT_PUBLIC_CONVEX_URL ? 'configured' : 'not-configured',
                    url: process.env.NEXT_PUBLIC_CONVEX_URL ? 'set' : 'missing',
                },
                geministream: {
                    status: process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'configured' : 'not-configured',
                },
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                nextVersion: '15.1.11',
                platform: 'server',
            },
            dependencies: {
                convex: 'available',
                generativeAi: 'available',
            },
        };

        // Check if Convex URL is properly configured
        if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
            health.checks.convex.status = 'error';
            health.status = 'degraded';
        }

        return Response.json(health, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        return Response.json(
            {
                status: 'error',
                message: error.message || 'Health check failed',
                timestamp: new Date().toISOString(),
            },
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
