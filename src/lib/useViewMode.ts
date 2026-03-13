'use client';

import { startTransition, useEffect, useState } from 'react';

const STORAGE_KEY = 'viewMode';
const EVENT_NAME = 'viewModeChange';

export function useViewMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setIsMobile(localStorage.getItem(STORAGE_KEY) === 'mobile');
    });

    function handler(e: Event) {
      startTransition(() => {
        setIsMobile((e as CustomEvent<string>).detail === 'mobile');
      });
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  function toggle() {
    const next = !isMobile;
    const value = next ? 'mobile' : 'pc';
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
    setIsMobile(next);
  }

  return { isMobile, toggle };
}
