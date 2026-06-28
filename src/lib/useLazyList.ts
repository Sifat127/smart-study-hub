import { useEffect, useRef, useState } from "react";

/**
 * Progressively reveal items from a list — only `initial` are rendered first,
 * then the count grows by `step` whenever a sentinel scrolls into view.
 *
 * Returns `{ visible, sentinelRef }`. Place a small div with `ref={sentinelRef}`
 * after the rendered items.
 */
export function useLazyList<T>(items: T[], initial = 6, step = 6) {
  const [count, setCount] = useState(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count whenever the underlying list identity changes (filters,
  // tab switch, etc.) so users always see the top of the new list first.
  useEffect(() => {
    setCount(initial);
  }, [items, initial]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (count >= items.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(items.length, c + step));
        }
      },
      { rootMargin: "400px 0px" } // start loading before the user actually reaches it
    );
    io.observe(node);
    return () => io.disconnect();
  }, [count, items.length, step]);

  return {
    visible: items.slice(0, count),
    sentinelRef,
    hasMore: count < items.length,
  };
}
