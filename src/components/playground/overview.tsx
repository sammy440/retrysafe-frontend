"use client";

import { useEffect, useMemo, useState } from "react";
import { Ticker } from "@/components/motion/ticker";
import type { AnalysisResult } from "@/lib/api";
import { classifyEffect, type EffectClass } from "./results";

export interface Run {
  ms: number;
  findings: number;
}

const CLASSES: { key: EffectClass; label: string; color: string }[] = [
  { key: "safe", label: "Guarded or idempotent", color: "#5aa7f7" },
  { key: "flagged", label: "Unsafe under retry", color: "#f97066" },
  { key: "unclear", label: "Idempotency unknown", color: "var(--chart-muted)" },
];

const SEVERITIES = [
  { key: "error", label: "errors", color: "#f04438" },
  { key: "warning", label: "warnings", color: "#f7bf1a" },
  { key: "info", label: "info", color: "#5aa7f7" },
] as const;

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return mounted;
}

function Tile({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-2/60 p-3 transition-colors duration-300 hover:border-accent/40">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{title}</p>
        {aside}
      </div>
      <div className="mt-2 flex flex-1 items-end">{children}</div>
    </div>
  );
}

function SeverityDonut({ counts }: { counts: Record<(typeof SEVERITIES)[number]["key"], number> }) {
  const mounted = useMounted();
  const total = counts.error + counts.warning + counts.info;
  const r = 26;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex w-full items-center gap-3">
      <svg viewBox="0 0 64 64" className="size-[68px] shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        {total === 0 ? (
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#17b26a"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${mounted ? c : 0} ${c}`}
            className="transition-[stroke-dasharray] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        ) : (
          SEVERITIES.map((s) => {
            const len = (counts[s.key] / total) * c;
            const seg = (
              <circle
                key={s.key}
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="7"
                strokeDasharray={`${mounted ? Math.max(0, len - (len > 4 ? 2 : 0)) : 0} ${c}`}
                strokeDashoffset={mounted ? -offset : 0}
                className="transition-[stroke-dasharray,stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            );
            offset += len;
            return seg;
          })
        )}
      </svg>
      <ul className="min-w-0 space-y-1 text-xs">
        {SEVERITIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            <span className="w-4 text-right font-medium tabular-nums">
              <Ticker value={counts[s.key]} initial={0} duration={700} />
            </span>
            <span className="text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandlerBars({ bars, runId }: { bars: { name: string; safe: number; flagged: number; unclear: number }[]; runId: number }) {
  const max = Math.max(1, ...bars.map((b) => b.safe + b.flagged + b.unclear));
  if (!bars.length) return <p className="text-xs text-muted">No handlers found.</p>;
  return (
    <div className="flex h-[68px] w-full items-end gap-1.5">
      {bars.slice(0, 10).map((b, i) => {
        const total = b.safe + b.flagged + b.unclear;
        return (
          <div
            key={`${runId}-${b.name}`}
            title={`${b.name}: ${total} effect${total === 1 ? "" : "s"}, ${b.flagged} unsafe`}
            className="grow-y flex max-w-[26px] min-w-[8px] flex-1 flex-col-reverse overflow-hidden rounded-[4px]"
            style={{ height: `${Math.max(8, (total / max) * 100)}%`, "--grow-delay": `${i * 70}ms` } as React.CSSProperties}
          >
            {total === 0 ? (
              <span className="h-full bg-border" />
            ) : (
              <>
                <span style={{ flex: b.flagged, background: "#f97066" }} />
                <span style={{ flex: b.unclear, background: "var(--chart-muted)" }} />
                <span style={{ flex: b.safe, background: "#5aa7f7" }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RunSparkline({ history, runId }: { history: Run[]; runId: number }) {
  const w = 120;
  const h = 44;
  if (history.length < 2) {
    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[44px] w-full" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1={h - 6} x2={w} y2={h - 6} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 4" />
        </svg>
        <p className="mt-1 text-[11px] text-muted">Edit and re-run to chart a trend.</p>
      </div>
    );
  }
  const pts = history.slice(-14);
  const max = Math.max(...pts.map((p) => p.ms));
  const min = Math.min(...pts.map((p) => p.ms));
  const span = Math.max(1, max - min);
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * (w - 6) + 3, h - 5 - ((p.ms - min) / span) * (h - 12)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1]!;
  return (
    <svg key={runId} viewBox={`0 0 ${w} ${h}`} className="h-[56px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5aa7f7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#5aa7f7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${lx} ${h} L${xy[0]![0]} ${h} Z`} fill="url(#spark-fill)" className="fade-in" />
      <path d={line} pathLength={1} fill="none" stroke="#2f80ed" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="draw" />
      <circle cx={lx} cy={ly} r="2.6" fill="#2f80ed" className="fade-in [animation-delay:700ms]" />
    </svg>
  );
}

export function AnalysisOverview({
  result,
  loading,
  failed,
  durationMs,
  fileCount,
  history,
  runId,
}: {
  result?: AnalysisResult;
  loading: boolean;
  failed: boolean;
  durationMs?: number;
  fileCount: number;
  history: Run[];
  runId: number;
}) {
  const stats = useMemo(() => {
    const classes: Record<EffectClass, number> = { safe: 0, flagged: 0, unclear: 0 };
    const severities = { error: 0, warning: 0, info: 0 };
    const bars = (result?.handlers ?? []).map((h) => {
      const b = { name: h.handler.name, safe: 0, flagged: 0, unclear: 0 };
      for (const e of h.effects) {
        const k = classifyEffect(h, e);
        b[k]++;
        classes[k]++;
      }
      return b;
    });
    for (const f of result?.findings ?? []) severities[f.severity]++;
    return { classes, severities, bars, total: classes.safe + classes.flagged + classes.unclear };
  }, [result]);

  const empty = !result;
  const settled = !loading && !failed && !!result;
  const flash = history.length > 1;

  return (
    <div className="rise overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_24px_60px_-28px_rgba(20,60,160,0.35)] transition-transform duration-500 hover:-translate-y-0.5">
      <div className="relative flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="grid size-[30px] place-items-center rounded-[8px] bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-4px_rgba(31,111,229,0.6)]">
          <svg viewBox="0 0 16 16" className={`size-[14px] ${loading ? "animate-spin [animation-duration:2.4s]" : ""}`} aria-hidden>
            <path d="M8 1.5c.4 3.3 1.9 5 5.5 6.5-3.6 1.5-5.1 3.2-5.5 6.5C7.6 11.2 6.1 9.5 2.5 8 6.1 6.5 7.6 4.8 8 1.5Z" fill="white" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-medium">Analysis overview</p>
          <p className="mt-[3px] truncate text-[11px] text-muted" aria-live="polite">
            {loading
              ? `Analyzing ${fileCount} file${fileCount === 1 ? "" : "s"}…`
              : failed
                ? "The last analysis failed"
                : result
                  ? `${result.handlers.length} handler${result.handlers.length === 1 ? "" : "s"} · ${stats.total} effect${stats.total === 1 ? "" : "s"}${durationMs !== undefined ? ` · ${durationMs} ms` : ""}`
                  : "Waiting for the first analysis"}
          </p>
        </div>
        {loading ? (
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            Analyzing
          </span>
        ) : failed ? (
          <span className="rounded-full bg-error-soft px-2.5 py-1 text-[11px] font-medium text-error">Error</span>
        ) : settled ? (
          <span className="flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[11px] font-medium text-ok">
            <span className="relative flex size-1.5">
              <span className="live-ping absolute inset-0 rounded-full bg-[#17b26a]" />
              <span className="relative size-1.5 rounded-full bg-[#17b26a]" />
            </span>
            Up to date
          </span>
        ) : null}
        {loading && <span className="progress-sweep absolute inset-x-0 bottom-[-1px] h-[2px]" aria-hidden />}
      </div>

      <div className="px-4 pt-4 pb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-medium tracking-[-0.01em]">Effects analyzed</p>
          {empty ? <span className="skeleton h-[14px] w-[36px] rounded" /> : <span className="text-[15px] tabular-nums"><Ticker value={stats.total} initial={0} flashOnChange={flash} /></span>}
        </div>
        <div className="mt-[10px] flex h-[18px] gap-[4px]">
          {empty || stats.total === 0 ? (
            <span className={`h-full w-full rounded-[5px] ${empty ? "skeleton" : "bg-border"}`} />
          ) : (
            CLASSES.map((c) => (
              <span
                key={c.key}
                className="bar-seg rounded-[5px] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${(stats.classes[c.key] / stats.total) * 100}%`, background: c.color, display: stats.classes[c.key] ? undefined : "none" }}
              />
            ))
          )}
        </div>
        <ul className="mt-[14px] space-y-[11px]">
          {CLASSES.map((c) => (
            <li key={c.key} className="flex items-center gap-[11px] text-[13.5px]">
              <span className={`size-[11px] rounded-[3px] ${empty ? "skeleton" : ""}`} style={empty ? undefined : { background: c.color }} />
              {empty ? <span className="skeleton h-[12px] w-[140px] rounded" /> : <span className="flex-1">{c.label}</span>}
              <span className="ml-auto tabular-nums">
                {empty ? <span className="skeleton inline-block h-[12px] w-[24px] rounded" /> : <Ticker value={stats.classes[c.key]} initial={0} flashOnChange={flash} />}
              </span>
              <span className="w-[46px] text-muted">effects</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <Tile title="Findings" aside={!empty && <span className="text-xs font-medium tabular-nums">{result.findings.length}</span>}>
            {empty ? <span className="skeleton h-[68px] w-full rounded-lg" /> : <SeverityDonut counts={stats.severities} />}
          </Tile>
          <Tile title="Per handler" aside={!empty && <span className="text-xs text-muted">effects</span>}>
            {empty ? <span className="skeleton h-[68px] w-full rounded-lg" /> : <HandlerBars bars={stats.bars} runId={runId} />}
          </Tile>
          <Tile title="Run time" aside={durationMs !== undefined && <span className="text-xs font-medium tabular-nums"><Ticker value={durationMs} initial={0} duration={600} /> ms</span>}>
            {empty ? <span className="skeleton h-[44px] w-full rounded-lg" /> : <RunSparkline history={history} runId={runId} />}
          </Tile>
        </div>
      </div>
    </div>
  );
}
