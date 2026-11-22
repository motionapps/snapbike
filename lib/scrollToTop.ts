import { createContext, useContext, useEffect, useRef } from 'react';

/** Set when the active tab's button is pressed again; nonce makes each press new. */
export type ScrollToTopRequest = { tab: string; nonce: number } | null;

export const ScrollToTopContext = createContext<ScrollToTopRequest>(null);

/** Runs `scroll` when the tab's button is pressed while the tab is already shown. */
export function useScrollToTop(tab: string, scroll: () => void) {
  const request = useContext(ScrollToTopContext);
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;
  useEffect(() => {
    if (request?.tab === tab) scrollRef.current();
  }, [request, tab]);
}
