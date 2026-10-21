"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Results } from "@/components/playground/results";
import type { AnalysisResult, SourceLocation } from "@/lib/api";

type Status = "idle" | "connecting" | "live" | "analyzing" | "disconnected";

type Message =
  | { type: "hello"; root: string; name: string; version: number }
  | { type: "analyzing"; changedFiles: string[] }
  | { type: "result"; result: AnalysisResult; durationMs: number; changedFiles: string[]; at: number }
  | { type: "error"; message: string };

interface Change {
  at: number;
  files: string[];
  added: number;
  fixed: number;
}

const EDITORS = [
  { id: "vscode", label: "VS Code", url: (abs: string, l: SourceLocation) => `vscode://file${abs}:${l.line}:${l.column}` },
  { id: "cursor", label: "Cursor", url: (abs: string, l: SourceLocation) => `cursor://file${abs}:${l.line}:${l.column}` },
  { id: "windsurf", label: "Windsurf", url: (abs: string, l: SourceLocation) => `windsurf://file${abs}:${l.line}:${l.column}` },
  { id: "vscodium", label: "VSCodium", url: (abs: string, l: SourceLocation) => `vscodium://file${abs}:${l.line}:${l.column}` },
  { id: "copy", label: "Copy path", url: undefined },
] as const;
type EditorId = (typeof EDITORS)[number]["id"];

function readParams(): { port: string; token: string } | undefined {
  // The token lives in the URL fragment, which browsers never send to any server.
  const p = new URLSearchParams(window.location.hash.slice(1));
  const port = p.get("port");
  const token = p.get("token");
  return port && token && /^\d+$/.test(port) ? { port, token } : undefined;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 2 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; dot: string; text: string }> = {
    idle: { label: "Not connected", dot: "bg-muted", text: "text-muted" },
    connecting: { label: "Connecting…", dot: "bg-warning", text: "text-warning" },
    live: { label: "Live", dot: "bg-ok", text: "text-ok" },
    analyzing: { label: "Analyzing…", dot: "bg-accent", text: "text-accent" },
    disconnected: { label: "Disconnected", dot: "bg-error", text: "text-error" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium ${s.text}`} role="status">
      <span className="relative flex size-2">
        {(status === "live" || status === "analyzing") && <span className={`live-ping absolute inset-0 rounded-full ${s.dot}`} />}
        <span className={`relative size-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

function Setup({ onConnect }: { onConnect: (port: string, token: string) => void }) {
  const [port, setPort] = useState("4317");
  const [token, setToken] = useState("");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-medium tracking-[-0.04em]">Live analysis</h1>
      <p className="mt-3 text-muted">
        Connect the project open in your editor. retrysafe re-analyzes it every time you save, on your machine, and this page updates in place. Your code never leaves your computer.
      </p>
      <ol className="mt-8 space-y-5">
        <li className="flex gap-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] text-sm font-medium text-white">1</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">In your project&apos;s terminal, run</p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-code px-4 py-3 font-mono text-sm">npx retrysafe live --open</pre>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] text-sm font-medium text-white">2</span>
          <div>
            <p className="font-medium">Open the link it prints</p>
            <p className="mt-1 text-sm text-muted">
              It looks like <code className="font-mono">/live#port=4317&amp;token=…</code>. With <code className="font-mono">--open</code> the browser opens it for you.
            </p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] text-sm font-medium text-white">3</span>
          <div>
            <p className="font-medium">Edit and save</p>
            <p className="mt-1 text-sm text-muted">Findings update within a moment of each save. Click a location to jump to it in your editor.</p>
          </div>
        </li>
      </ol>
      <form
        className="mt-10 rounded-xl border border-border bg-surface-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (port && token) onConnect(port, token);
        }}
      >
        <p className="text-sm font-medium">Or connect manually</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} aria-label="Port" className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm" />
          <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="token" aria-label="Token" className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm" />
          <button type="submit" className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50" disabled={!port || !token}>
            Connect
          </button>
        </div>
      </form>
    </div>
  );
}

export function LivePanel() {
  const [params, setParams] = useState<{ port: string; token: string }>();
  const [status, setStatus] = useState<Status>("idle");
  const [project, setProject] = useState<{ root: string; name: string }>();
  const [result, setResult] = useState<{ result: AnalysisResult; durationMs: number; at: number }>();
  const [error, setError] = useState<string>();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Change[]>([]);
  // Starts at 0 and is set in an effect: reading the clock during prerender is not allowed.
  const [now, setNow] = useState(0);
  const [editor, setEditor] = useState<EditorId>("vscode");
  const [hideClean, setHideClean] = useState(true);
  const [toast, setToast] = useState<string>();
  const [retryIn, setRetryIn] = useState<number>();
  const prevIds = useRef<Set<string> | undefined>(undefined);
  const attempt = useRef(0);
  const reconnect = useRef<() => void>(() => {});

  useEffect(() => {
    setParams(readParams());
    const onHash = () => setParams(readParams());
    window.addEventListener("hashchange", onHash);
    try {
      const saved = localStorage.getItem("retrysafe.editor") as EditorId | null;
      if (saved && EDITORS.some((e) => e.id === saved)) setEditor(saved);
    } catch {
      // storage unavailable
    }
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!params) {
      setStatus("idle");
      return;
    }
    let ws: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let countdown: ReturnType<typeof setInterval> | undefined;
    let closed = false;

    const open = () => {
      clearTimeout(timer);
      clearInterval(countdown);
      setRetryIn(undefined);
      setStatus("connecting");
      ws = new WebSocket(`ws://127.0.0.1:${params.port}/live?token=${encodeURIComponent(params.token)}`);
      ws.onopen = () => {
        attempt.current = 0;
        setError(undefined);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as Message;
        if (msg.type === "hello") {
          setProject({ root: msg.root, name: msg.name });
          setStatus("live");
        } else if (msg.type === "analyzing") {
          setStatus("analyzing");
        } else if (msg.type === "error") {
          setError(msg.message);
          setStatus("live");
        } else if (msg.type === "result") {
          const ids = new Set(msg.result.findings.map((f) => f.id));
          const prev = prevIds.current;
          if (prev) {
            const added = [...ids].filter((id) => !prev.has(id));
            const fixed = [...prev].filter((id) => !ids.has(id)).length;
            setNewIds(new Set(added));
            if (msg.changedFiles.length) setChanges((c) => [{ at: msg.at, files: msg.changedFiles, added: added.length, fixed }, ...c].slice(0, 6));
          }
          prevIds.current = ids;
          setResult({ result: msg.result, durationMs: msg.durationMs, at: msg.at });
          setError(undefined);
          setStatus("live");
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("disconnected");
        // Back off 1s, 2s, 4s… up to 15s; the CLI may simply be restarting.
        const delay = Math.min(15_000, 1000 * 2 ** attempt.current++);
        let left = Math.round(delay / 1000);
        setRetryIn(left);
        countdown = setInterval(() => setRetryIn(--left > 0 ? left : undefined), 1000);
        timer = setTimeout(open, delay);
      };
    };
    reconnect.current = () => {
      attempt.current = 0;
      ws?.close();
      open();
    };
    open();
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(countdown);
      ws?.close();
    };
  }, [params]);

  const onSelect = useCallback(
    async (loc: SourceLocation) => {
      if (!project) return;
      // Editor URLs want forward slashes and a leading slash, also for Windows drives (/C:/…).
      const root = project.root.replace(/\\/g, "/").replace(/\/$/, "");
      const abs = `${root.startsWith("/") ? "" : "/"}${root}/${loc.file}`;
      const target = EDITORS.find((e) => e.id === editor)!;
      if (target.url) {
        window.location.href = target.url(abs, loc);
      } else {
        await navigator.clipboard?.writeText(`${abs}:${loc.line}:${loc.column}`).catch(() => {});
        setToast(`Copied ${loc.file}:${loc.line}`);
        setTimeout(() => setToast(undefined), 1800);
      }
    },
    [project, editor],
  );

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const f of result?.result.findings ?? []) c[f.severity]++;
    return c;
  }, [result]);

  if (!params) return <Setup onConnect={(port, token) => (window.location.hash = `port=${port}&token=${encodeURIComponent(token)}`)} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-border bg-surface p-4">
          <StatusPill status={status} />
          <p className="mt-3 truncate font-medium" title={project?.root}>
            {project?.name ?? "…"}
          </p>
          <p className="truncate font-mono text-xs text-muted" title={project?.root}>
            {project?.root ?? `127.0.0.1:${params.port}`}
          </p>
          {result && (
            <p className="mt-3 text-xs text-muted">
              Analyzed {ago(now - result.at)} · {result.durationMs} ms
            </p>
          )}
          {status === "disconnected" && (
            <div className="mt-3 text-xs text-muted">
              <p>Is <code className="font-mono">retrysafe live</code> still running?{retryIn ? ` Retrying in ${retryIn}s.` : ""}</p>
              <button type="button" onClick={() => reconnect.current()} className="mt-2 rounded-md border border-border px-2.5 py-1 font-medium text-fg hover:border-accent">
                Retry now
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["error", "warning", "info"] as const).map((s) => (
              <div key={s} className="rounded-xl border border-border bg-surface px-2 py-3">
                <p className={`text-xl font-medium tabular-nums ${counts[s] ? (s === "error" ? "text-error" : s === "warning" ? "text-warning" : "text-info") : "text-muted"}`}>{counts[s]}</p>
                <p className="text-[11px] text-muted">{s === "info" ? "info" : `${s}s`}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <label className="block text-xs font-medium text-muted" htmlFor="editor">
            Open locations in
          </label>
          <select
            id="editor"
            value={editor}
            onChange={(e) => {
              setEditor(e.target.value as EditorId);
              try {
                localStorage.setItem("retrysafe.editor", e.target.value);
              } catch {
                // storage unavailable
              }
            }}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-2 py-1.5"
          >
            {EDITORS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={hideClean} onChange={(e) => setHideClean(e.target.checked)} />
            Only handlers with findings
          </label>
        </div>

        {changes.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted">Recent saves</p>
            <ul className="mt-2 space-y-2 text-xs">
              {changes.map((c) => (
                <li key={c.at}>
                  <p className="truncate font-mono" title={c.files.join(", ")}>
                    {c.files[0]}
                    {c.files.length > 1 ? ` +${c.files.length - 1}` : ""}
                  </p>
                  <p className="text-muted">
                    {ago(now - c.at)}
                    {c.added > 0 && <span className="text-error"> · +{c.added} new</span>}
                    {c.fixed > 0 && <span className="text-ok"> · {c.fixed} fixed</span>}
                    {!c.added && !c.fixed && " · no change"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section className="min-w-0">
        {error && (
          <div className="mb-4 rounded-xl border border-error/40 bg-error-soft p-4 text-sm text-error" role="alert">
            Analysis failed: {error}
          </div>
        )}
        {result ? (
          <Results result={result.result} onSelect={onSelect} newFindingIds={newIds} hideClean={hideClean} />
        ) : (
          <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-2" />
        )}
        {result && hideClean && result.result.handlers.length > 0 && result.result.findings.length === 0 && (
          <p className="rounded-xl border border-ok/30 bg-ok-soft p-4 text-sm text-ok">All {result.result.handlers.length} handlers are clean. Keep editing; this page updates on save.</p>
        )}
      </section>
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-fg px-3 py-2 text-sm text-bg shadow-lg">{toast}</div>}
    </div>
  );
}
