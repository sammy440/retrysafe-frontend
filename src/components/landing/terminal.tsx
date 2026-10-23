"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Terminal({ lines }: { lines: { prompt?: boolean; content: ReactNode; text?: string }[] }) {
  const ref = useRef<HTMLPreElement>(null);
  const [shown, setShown] = useState(lines.length);
  const [typed, setTyped] = useState<number | undefined>(undefined);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPending(false);
      return;
    }
    const el = ref.current;
    if (!el) return;
    setShown(0);
    setPending(false);
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = async () => {
      const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
      for (let i = 0; i < lines.length && !cancelled; i++) {
        const line = lines[i]!;
        if (line.prompt && line.text) {
          setShown(i);
          for (let c = 0; c <= line.text.length && !cancelled; c++) {
            setTyped(c);
            await wait(28);
          }
          setTyped(undefined);
          setShown(i + 1);
          await wait(380);
        } else {
          setShown(i + 1);
          await wait(line.content === "" ? 60 : 110);
        }
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void run();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [lines]);

  const typing = typed !== undefined ? lines[shown] : undefined;
  return (
    <pre ref={ref} data-pending={pending ? "" : undefined} className="min-h-[392px] overflow-x-auto font-mono text-[12.5px] leading-6 text-white/85">
      {lines.slice(0, shown).map((l, i) => (
        <div key={i}>{l.content === "" ? " " : l.content}</div>
      ))}
      {typing && (
        <div>
          <span className="text-white/50">$ </span>
          {typing.text!.slice(0, typed)}
          <span className="caret ml-px inline-block h-[14px] w-[7px] translate-y-[2px] bg-white/80" />
        </div>
      )}
      {!typing && shown >= lines.length && (
        <div>
          <span className="text-white/50">$ </span>
          <span className="caret inline-block h-[14px] w-[7px] translate-y-[2px] bg-white/80" />
        </div>
      )}
    </pre>
  );
}
