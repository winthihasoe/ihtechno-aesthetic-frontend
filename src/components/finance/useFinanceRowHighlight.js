import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function highlightKey(highlight) {
  if (!highlight?.sourceType || !highlight?.sourceId) return null;
  return `${highlight.sourceType}:${highlight.sourceId}`;
}

/**
 * Scroll to and pulse-highlight a row after cross-page navigation.
 * Runs at most once per highlight key to avoid navigate/setState loops.
 *
 * @param {object} options
 * @param {boolean} options.ready data finished loading
 * @param {boolean} options.found matching row is in the current list
 * @param {() => void} [options.onMissed] when highlight target not in loaded rows
 * @param {boolean} [options.enableScroll] scroll to row when found (default true)
 */
export function useFinanceRowHighlight({
  ready,
  found,
  onMissed,
  enableScroll = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const [active, setActive] = useState(false);
  const onMissedRef = useRef(onMissed);
  const handledKeyRef = useRef(null);

  onMissedRef.current = onMissed;

  const highlight = location.state?.financeHighlight ?? null;
  const key = highlightKey(highlight);

  useEffect(() => {
    if (!key) {
      handledKeyRef.current = null;
      return;
    }
    if (!ready) return;
    if (handledKeyRef.current === key) return;

    if (!found) {
      handledKeyRef.current = key;
      onMissedRef.current?.();
      return;
    }

    handledKeyRef.current = key;

    if (!enableScroll) {
      setActive(true);
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setActive(true);
    }, 80);

    const clearTimer = window.setTimeout(() => {
      setActive(false);
      navigate(location.pathname, { replace: true, state: {} });
    }, 3200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [key, ready, found, enableScroll, navigate, location.pathname]);

  return { rowRef, highlightActive: active, highlight };
}
