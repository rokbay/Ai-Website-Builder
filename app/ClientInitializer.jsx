'use client';

import { useInitializeConnectivity } from '@/lib/useConnectivity';

/**
 * Client-side initializer for connectivity checks
 * This component must be 'use client' to run hooks on client side
 */
export default function ClientInitializer({ children }) {
    useInitializeConnectivity();

    return <>{children}</>;
}
