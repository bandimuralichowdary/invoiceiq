'use client';

import { useEffect, useState } from 'react';

export function useGuest() {
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        // Determine guest mode from cookie (simplest way for client)
        const match = document.cookie.match(new RegExp('(^| )guest-mode=([^;]+)'));
        if (match && match[2] === 'true') {
            setIsGuest(true);
        }
    }, []);

    return isGuest;
}
