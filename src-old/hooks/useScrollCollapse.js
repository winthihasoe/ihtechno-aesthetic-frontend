import { useEffect, useRef, useState } from "react";

const SCROLL_CONTAINER_ID = "workspace-scroll-container";
const TOP_EXPAND_AT = 16;
const COLLAPSE_DISTANCE = 80;
const EXPAND_DISTANCE = 32;
const MAX_DELTA = 40;
const COOLDOWN_MS = 280;

/**
 * Collapses sticky room headers when the user scrolls down;
 * expands again when scrolling up or near the top of the page.
 *
 * Uses cumulative scroll distance and a short cooldown so layout shifts
 * from the header resizing do not flip state back and forth.
 */
export default function useScrollCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const stateRef = useRef({
    collapsed: false,
    downAccum: 0,
    upAccum: 0,
    lastScrollTop: 0,
    cooldownUntil: 0,
  });

  useEffect(() => {
    const container = document.getElementById(SCROLL_CONTAINER_ID);
    if (!container) return undefined;

    stateRef.current.lastScrollTop = container.scrollTop;

    let ticking = false;

    const applyCollapsed = (next) => {
      if (stateRef.current.collapsed === next) return;
      stateRef.current.collapsed = next;
      stateRef.current.downAccum = 0;
      stateRef.current.upAccum = 0;
      stateRef.current.cooldownUntil = performance.now() + COOLDOWN_MS;
      setCollapsed(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const now = performance.now();
        const scrollTop = container.scrollTop;
        const delta = scrollTop - stateRef.current.lastScrollTop;

        stateRef.current.lastScrollTop = scrollTop;

        if (now < stateRef.current.cooldownUntil) {
          ticking = false;
          return;
        }

        if (Math.abs(delta) > MAX_DELTA) {
          ticking = false;
          return;
        }

        if (scrollTop <= TOP_EXPAND_AT) {
          applyCollapsed(false);
        } else if (delta > 0) {
          stateRef.current.upAccum = 0;
          stateRef.current.downAccum += delta;
          if (
            !stateRef.current.collapsed &&
            stateRef.current.downAccum >= COLLAPSE_DISTANCE
          ) {
            applyCollapsed(true);
          }
        } else if (delta < 0) {
          stateRef.current.downAccum = 0;
          stateRef.current.upAccum += Math.abs(delta);
          if (
            stateRef.current.collapsed &&
            stateRef.current.upAccum >= EXPAND_DISTANCE
          ) {
            applyCollapsed(false);
          }
        }

        ticking = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return collapsed;
}
