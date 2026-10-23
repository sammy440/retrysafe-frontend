"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalyzeError, analyze, type AnalysisResult, type Confidence, type SourceLocation } from "@/lib/api";
import { EXAMPLES } from "@/lib/examples";
import type { Marker } from "./editor";
import { AnalysisOverview, type Run } from "./overview";
import { Results } from "./results";

const Editor = dynamic(() => import("./editor"), { ssr: false, loading: () => <div className="h-full animate-pulse bg-surface-2" /> });

const CONFIDENCE: Confidence[] = ["high", "medium", "low"];

const isSource = (f: string) => /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f);

export function Playground() {
  const params = useSearchParams();
  const initial = EXAMPLES.find((e) => e.id === params.get("example")) ?? EXAMPLES[0]!;
  const [exampleId, setExampleId] = useState(initial.id);
  const [files, setFiles] = useState<Record<string, string>>(initial.files);
  const [active, setActive] = useState(Object.keys(initial.files)[0]!);
  const [minConfidence, setMinConfidence] = useState<Confidence>("medium");
  const [result, setResult] = useState<AnalysisResult>();
  const [duration, setDuration] = useState<number>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Run[]>([]);
  const [runId, setRunId] = useState(0);
  const [focus, setFocus] = useState<{ line: number; nonce: number }>();
  const abort = useRef<AbortController>(undefined);

  const run = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError(undefined);
    try {
      const r = await analyze(files, { minConfidence }, controller.signal);
      setResult(r.result);
      setDuration(r.durationMs);
      setHistory((h) => [...h, { ms: r.durationMs, findings: r.result.findings.length }].slice(-14));
      setRunId((n) => n + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setResult(undefined);
      if (err instanceof AnalyzeError) {
        const details = err.error.details?.map((d) => `${d.path}: ${d.message}`).join("; ");
        setError(`${err.error.message}${details ? ` (${details})` : ""}`);
      } else setError((err as Error).message);
    } finally {
      if (abort.current === controller) setLoading(false);
    }
  }, [files, minConfidence]);

  const [pendingRun, setPendingRun] = useState(true);
  useEffect(() => {
    if (!pendingRun) return;
    setPendingRun(false);
    void run();
  }, [pendingRun, run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id)!;
    setExampleId(id);
    setFiles(ex.files);
    setActive(Object.keys(ex.files)[0]!);
    setResult(undefined);
    setError(undefined);
    window.history.replaceState(null, "", `?example=${id}`);
    setPendingRun(true);
  };

  const markers: Marker[] = useMemo(
    () =>
      (result?.findings ?? [])
        .filter((f) => f.location.file === active)
        .map((f) => ({ line: f.location.line, column: f.location.column, severity: f.severity, message: `${f.rule}: ${f.message}` })),
    [result, active],
  );
  const findingsPerFile = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of result?.findings ?? []) m.set(f.location.file, (m.get(f.location.file) ?? 0) + 1);
    return m;
  }, [result]);

  const select = (loc: SourceLocation) => {
    if (files[loc.file] === undefined) return;
    setActive(loc.file);
    setFocus({ line: loc.line, nonce: Date.now() });
  };

  const addFile = () => {
    const name = window.prompt("File path (e.g. lib/billing.ts, prisma/schema.prisma)")?.trim();
    if (!name) return;
    if (files[name] !== undefined) return setActive(name);
    setFiles({ ...files, [name]: "" });
    setActive(name);
  };
  const removeFile = (name: string) => {
    if (Object.keys(files).length === 1 || !window.confirm(`Remove ${name}?`)) return;
    const next = { ...files };
    delete next[name];
    setFiles(next);
    if (active === name) setActive(Object.keys(next)[0]!);
  };

  const example = EXAMPLES.find((e) => e.id === exampleId);
  const confidenceIndex = CONFIDENCE.indexOf(minConfidence);

  return (
    <div className="space-y-4">
      <section className="play-hero rise relative isolate overflow-hidden rounded-[22px] border border-border px-5 pt-6 pb-5 sm:px-7">
        <span aria-hidden className="float-blob -z-10 left-[-6%] top-[-40%] size-[300px] bg-[#7cc0ff]" />
        <span aria-hidden className="float-blob -z-10 right-[-4%] top-[-30%] size-[260px] bg-[#a9b8ff] [animation-delay:-6s]" />
        <span aria-hidden className="float-blob -z-10 right-[30%] bottom-[-70%] size-[240px] bg-[#9fe3ff] [animation-delay:-11s]" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#17b26a]" />
              Playground · analyzed statically, never run or stored
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-[32px]">
              What happens if this <span className="sky-text">runs twice?</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">Paste a webhook handler or queue worker, or start from an example. Findings show up in the editor and on the right.</p>
          </div>
        </div>
        <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Examples">
          {EXAMPLES.map((e, i) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === exampleId}
              onClick={() => loadExample(e.id)}
              className={`group flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-all duration-300 ${
                e.id === exampleId
                  ? "border-accent/40 bg-surface text-fg shadow-[0_6px_18px_-8px_rgba(31,111,229,0.55)]"
                  : "border-border bg-surface/55 text-muted backdrop-blur hover:-translate-y-0.5 hover:bg-surface hover:text-fg"
              }`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold transition-colors ${
                  e.id === exampleId ? "bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] text-white" : "bg-surface-2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              {e.title}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rise flex min-h-[560px] flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_24px_60px_-30px_rgba(20,60,160,0.35)] [--rise-delay:80ms] lg:sticky lg:top-[4.5rem] lg:self-start lg:h-[calc(100vh-6rem)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2.5">
            <span className="hidden gap-1.5 pl-1 sm:flex" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff6b5f]" />
              <span className="size-2.5 rounded-full bg-[#ffbe2f]" />
              <span className="size-2.5 rounded-full bg-[#2acb42]" />
            </span>
            <div className="relative grid grid-cols-3 rounded-full bg-surface-2 p-0.5 text-xs" role="radiogroup" aria-label="Minimum confidence">
              <span
                aria-hidden
                className="absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-full bg-surface shadow-[0_1px_3px_rgba(20,40,110,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(${confidenceIndex * 100}%)` }}
              />
              {CONFIDENCE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === minConfidence}
                  onClick={() => {
                    setMinConfidence(c);
                    setPendingRun(true);
                  }}
                  className={`relative px-3 py-1 transition-colors ${c === minConfidence ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="hidden text-xs text-muted md:inline">confidence</span>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className={`ml-auto flex items-center gap-2 rounded-full bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] px-4 py-1.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_-6px_rgba(31,111,229,0.7)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_22px_-8px_rgba(31,111,229,0.8)] active:translate-y-0 disabled:cursor-progress ${loading ? "btn-shine" : ""}`}
            >
              <svg viewBox="0 0 16 16" className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden>
                {loading ? (
                  <path d="M8 2a6 6 0 1 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
                )}
              </svg>
              {loading ? "Analyzing" : "Analyze"}
              <kbd className="hidden rounded bg-white/20 px-1 font-sans text-[10px] sm:inline">⌘↵</kbd>
            </button>
          </div>
          {example && (
            <p key={example.id} className="fade-in flex items-start gap-2 border-b border-border bg-accent-soft/50 px-4 py-2 text-xs text-muted">
              <svg viewBox="0 0 16 16" className="mt-px size-3.5 shrink-0 text-accent" aria-hidden>
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {example.summary}
            </p>
          )}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5" role="tablist" aria-label="Files">
            {Object.keys(files).map((f) => (
              <div
                key={f}
                className={`group flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap transition-colors duration-200 ${
                  f === active ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <button type="button" role="tab" aria-selected={f === active} onClick={() => setActive(f)} className="font-mono">
                  {f}
                  {findingsPerFile.get(f) ? (
                    <span key={`${runId}-${f}`} className="pop ml-1.5 inline-block rounded-full bg-error-soft px-1.5 text-[10px] font-medium text-error">
                      {findingsPerFile.get(f)}
                    </span>
                  ) : null}
                </button>
                <button type="button" onClick={() => removeFile(f)} className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100" aria-label={`Remove ${f}`}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addFile} className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Add file">
              + file
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Editor
              key={active}
              value={files[active] ?? ""}
              language={isSource(active) ? "ts" : "other"}
              onChange={(v) => setFiles((prev) => ({ ...prev, [active]: v }))}
              markers={markers}
              focusLine={focus}
            />
            {loading && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="scan-beam" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <AnalysisOverview
            result={result}
            loading={loading}
            failed={!!error}
            durationMs={duration}
            fileCount={Object.keys(files).length}
            history={history}
            runId={runId}
          />
          {error && (
            <div className="rise rounded-xl border border-error/40 bg-error-soft p-4 text-sm text-error" role="alert">
              {error}
            </div>
          )}
          {result ? (
            <div key={runId}>
              <Results result={result} onSelect={select} stagger />
              <p className="mt-3 text-xs text-muted">Your code was analyzed statically. It was not executed or stored.</p>
            </div>
          ) : (
            !error &&
            loading && (
              <div className="space-y-3" aria-hidden>
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-2xl border border-border bg-surface p-4">
                    <span className="skeleton block h-4 w-40 rounded" />
                    <span className="skeleton mt-4 block h-3 w-full rounded" />
                    <span className="skeleton mt-2.5 block h-3 w-4/5 rounded" />
                    <span className="skeleton mt-2.5 block h-3 w-3/5 rounded" />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
