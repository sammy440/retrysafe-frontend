"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ticker } from "@/components/motion/ticker";

type Counts = { guarded: number; missing: number; fixed: number };

const FINAL: Counts = { guarded: 1620, missing: 462, fixed: 232 };
const SERVICES = 5;

const ROWS = [
  { key: "guarded", label: "Guarded & idempotent", color: "bg-[#5aa7f7]" },
  { key: "missing", label: "Missing idempotency key", color: "bg-[#f7bf1a]" },
  { key: "fixed", label: "Fixed with retrysafe fix", color: "bg-[#17b26a]" },
] as const;

type Phase = "connecting" | "scanning" | "live";

export function OverviewCard() {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [scanned, setScanned] = useState(0);
  const [counts, setCounts] = useState<Counts>({ guarded: 0, missing: 0, fixed: 0 });
  const [updatedAgo, setUpdatedAgo] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("live");
      setScanned(SERVICES);
      setCounts(FINAL);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const shares = [0.18, 0.41, 0.63, 0.86, 1];
    at(900, () => setPhase("scanning"));
    shares.forEach((s, i) =>
      at(1000 + i * 520, () => {
        setScanned(i + 1);
        setCounts({ guarded: FINAL.guarded * s, missing: FINAL.missing * Math.min(1, s * 1.12), fixed: FINAL.fixed * s ** 1.4 });
      }),
    );
    at(1000 + shares.length * 520 + 300, () => setPhase("live"));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "live" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = setInterval(() => setUpdatedAgo((s) => s + 1), 1000);
    const batch = setInterval(() => {
      setCounts((c) => {
        const fixedNow = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 0;
        return {
          guarded: c.guarded + 1 + Math.floor(Math.random() * 4),
          missing: Math.max(380, c.missing - fixedNow + (Math.random() < 0.3 ? 1 : 0)),
          fixed: c.fixed + fixedNow,
        };
      });
      setUpdatedAgo(0);
    }, 4200);
    return () => {
      clearInterval(tick);
      clearInterval(batch);
    };
  }, [phase]);

  const total = counts.guarded + counts.missing + counts.fixed;
  const live = phase === "live";
  const loading = phase === "connecting";

  return (
    <div className="mx-auto w-full max-w-[452px] rounded-[18px] bg-[#e9eef5] text-left shadow-[0_24px_60px_-20px_rgba(20,40,110,0.45)] ring-1 ring-white/70 transition-transform duration-500 hover:-translate-y-1">
      <div className="rounded-[18px] bg-white shadow-[0_1px_0_rgba(30,60,140,0.14),0_2px_4px_rgba(30,60,140,0.06)]">
        <div className="flex items-center gap-3 border-b border-[#eceff3] px-[14px] py-[11px]">
          <span className="grid size-[27px] place-items-center rounded-[7px] bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <svg viewBox="0 0 16 16" className={`size-[13px] ${loading || phase === "scanning" ? "animate-spin [animation-duration:2.4s]" : ""}`} aria-hidden>
              <path d="M8 1.5c.4 3.3 1.9 5 5.5 6.5-3.6 1.5-5.1 3.2-5.5 6.5C7.6 11.2 6.1 9.5 2.5 8 6.1 6.5 7.6 4.8 8 1.5Z" fill="white" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[12.5px] font-medium text-[#1d2433]">Retry Safety Overview</p>
            <p className="mt-[3px] text-[10.5px] text-[#7a8494]" aria-live="polite">
              {loading && "Connecting to retrysafe…"}
              {phase === "scanning" && `Scanning ${scanned} of ${SERVICES} services…`}
              {live && `Scanned across ${SERVICES} services · ${updatedAgo < 2 ? "updated just now" : `updated ${updatedAgo}s ago`}`}
            </p>
          </div>
          {live ? (
            <span className="flex items-center gap-1.5 pr-1 text-[10.5px] font-medium text-[#067647]">
              <span className="relative flex size-[7px]">
                <span className="live-ping absolute inset-0 rounded-full bg-[#17b26a]" />
                <span className="relative size-[7px] rounded-full bg-[#17b26a]" />
              </span>
              Live
            </span>
          ) : (
            <span className="pr-1 text-[15px] leading-none tracking-[0.12em] text-[#4b5565]" aria-hidden>
              ···
            </span>
          )}
        </div>
        <div className="px-[14px] pt-[14px] pb-[14px]">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium tracking-[-0.01em] text-[#1d2433]">Effects Analyzed</p>
            {loading ? (
              <span className="skeleton h-[14px] w-[44px] rounded" />
            ) : (
              <p className="text-[14px] text-[#1d2433]">
                <Ticker value={total} flashOnChange={live} />
              </p>
            )}
          </div>
          <div className="mt-[10px] flex h-[19px] gap-[4px]">
            {loading ? (
              <span className="skeleton h-full w-full rounded-[5px]" />
            ) : (
              ROWS.map((r) => (
                <span
                  key={r.key}
                  className={`rounded-[5px] ${r.color} transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]`}
                  style={{ width: total ? `${(counts[r.key] / total) * 100}%` : "0%" }}
                />
              ))
            )}
          </div>
          <ul className="mt-[14px] space-y-[13px]">
            {ROWS.map((r) => (
              <li key={r.key} className="flex items-center gap-[11px] text-[13.5px]">
                <span className={`size-[11px] rounded-[3px] ${loading ? "skeleton" : r.color}`} />
                {loading ? (
                  <span className="skeleton h-[12px] w-[150px] rounded" />
                ) : (
                  <span className="flex-1 text-[#1d2433]">{r.label}</span>
                )}
                <span className="ml-auto text-[#1d2433]">{loading ? <span className="skeleton inline-block h-[12px] w-[34px] rounded" /> : <Ticker value={counts[r.key]} flashOnChange={live} />}</span>
                <span className="w-[44px] text-[#8b93a1]">Effects</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link href="/playground" className="group flex items-center justify-between px-[15px] py-[13px] text-[13.5px] text-[#3a4352] hover:text-[#1d2433]">
        View full report
        <svg viewBox="0 0 16 16" className="size-[14px] transition-transform group-hover:translate-x-0.5" aria-hidden>
          <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}
