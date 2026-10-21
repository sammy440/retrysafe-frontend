"use client";

import { useEffect, useRef, useState } from "react";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that tweens to its new value and flashes when it changes after the first load.
 * `initial` sets where the first tween starts (0 counts up on mount).
 */
export function Ticker({ value, initial, duration = 900, flashOnChange }: { value: number; initial?: number; duration?: number; flashOnChange?: boolean }) {
  const [shown, setShown] = useState(initial ?? value);
  const [flash, setFlash] = useState(0);
  const from = useRef(initial ?? value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setShown(a + (value - a) * easeOut(k));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    if (flashOnChange && a !== value) setFlash((f) => f + 1);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, flashOnChange]);
  return (
    <span key={flash} className={`tabular-nums ${flash ? "flash" : ""}`}>
      {fmt(shown)}
    </span>
  );
}
