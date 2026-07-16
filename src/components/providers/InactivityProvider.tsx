'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInactivity = async () => {
    // Attempt to sign out gracefully, then redirect with the timeout parameter
    await signOut({ redirect: false });
    router.push('/login?timeout=true');
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleInactivity, TIMEOUT_MS);
  };

  useEffect(() => {
    // Initialize timer
    resetTimer();

    // Events to track activity
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    // Throttle the event listeners to avoid excessive re-renders/CPU usage
    let throttleTimer = false;
    const activityHandler = () => {
      if (!throttleTimer) {
        resetTimer();
        throttleTimer = true;
        setTimeout(() => (throttleTimer = false), 1000); // Only reset timer max once per second
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, activityHandler, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, [router]);

  return <>{children}</>;
}
