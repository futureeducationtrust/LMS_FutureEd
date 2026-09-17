"use client";

import { useEffect, useRef, useState } from "react";

// Renders children only once the placeholder is near the viewport (or the
// browser is idle), so heavy below-the-fold widgets — the apexcharts
// dashboards — don't download and parse while the page's first content is
// still painting. Keeps a fixed-height placeholder so nothing shifts.
export function LazyMount({
  children,
  minHeight = 280,
  rootMargin = "200px",
  className,
  enabled = true,
}: {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
  className?: string;
  // Gate on the page's primary data: charts should never start downloading
  // while the content that will be the LCP is still in flight.
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !enabled) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    // Above-the-fold on a tall screen still waits for idle, not for scroll.
    const hasIdle = "requestIdleCallback" in window;
    const handle = hasIdle
      ? window.requestIdleCallback(() => setVisible(true), { timeout: 4000 })
      : window.setTimeout(() => setVisible(true), 2500);
    return () => {
      io.disconnect();
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [visible, enabled, rootMargin]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
