"use client";

import Link from "next/link";
import { ConfidenceBadge, SeverityBadge } from "@/components/badges";
import type { AnalysisResult, Effect, Finding, Guard, HandlerReport, SourceLocation } from "@/lib/api";

const at = (l: SourceLocation) => `${l.file}:${l.line}`;

function LocationButton({ loc, onSelect }: { loc: SourceLocation; onSelect: (l: SourceLocation) => void }) {
  return (
    <button type="button" onClick={() => onSelect(loc)} className="font-mono text-xs text-muted underline-offset-2 hover:text-accent hover:underline">
      {at(loc)}
    </button>
  );
}

function effectStatus(e: Effect, flagged: Finding[]): { mark: string; tone: string; text: string } {
  const guard = e.protectedBy[e.protectedBy.length - 1];
  const base = e.hasIdempotencyKey
    ? `idempotency key (${e.acceptsIdempotencyKey?.field})`
    : guard
      ? `guarded by ${guard.description}${guard.atomic === false ? " (not atomic)" : ""}`
      : e.idempotent === true
        ? e.note ? `idempotent: ${e.note}` : "idempotent"
        : e.idempotent === false
          ? "no guard on this path"
          : (e.note ?? "idempotency unknown");
  if (flagged.some((f) => f.severity === "error")) return { mark: "✖", tone: "text-error", text: base };
  if (flagged.length) return { mark: "⚠", tone: "text-warning", text: base };
  if (e.hasIdempotencyKey || (guard && guard.atomic !== false) || e.idempotent === true) return { mark: "✔", tone: "text-ok", text: base };
  return { mark: "?", tone: "text-muted", text: base };
}

export type EffectClass = "safe" | "flagged" | "unclear";

/** Buckets an effect for the overview charts, using the same status the effect map shows. */
export function classifyEffect(report: HandlerReport, e: Effect): EffectClass {
  const flagged = report.findings.filter((f) => f.effect && f.effect.order === e.order);
  if (flagged.length) return "flagged";
  return effectStatus(e, flagged).tone === "text-ok" ? "safe" : "unclear";
}

function guardNote(g: Guard): string {
  if (g.schema === "unique-constraint") return `unique constraint in ${g.schemaSource ?? "schema"}`;
  if (g.schema === "no-unique-constraint") return `no unique constraint in ${g.schemaSource ?? "schema"}`;
  if (g.atomic === false) return "not atomic";
  if (g.atomic === "unknown") return "atomic if the key column is unique";
  return "atomic";
}

function Row({ mark, tone, kind, title, loc, via, note, noteTone, onSelect }: {
  mark: string;
  tone: string;
  kind: string;
  title: string;
  loc: SourceLocation;
  via?: SourceLocation;
  note: string;
  noteTone?: string;
  onSelect: (l: SourceLocation) => void;
}) {
  return (
    <li className="flex gap-3 border-t border-border px-4 py-2.5 first:border-t-0">
      <span className={`w-4 shrink-0 text-center ${tone}`}>{mark}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="w-16 shrink-0 text-xs text-muted">{kind}</span>
          <code className="font-mono text-sm break-all">{title}</code>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs">
          <LocationButton loc={loc} onSelect={onSelect} />
          {via && <span className="text-muted">via {at(via)}</span>}
          <span className={noteTone ?? "text-muted"}>{note}</span>
        </div>
      </div>
    </li>
  );
}

function EffectMap({ report, onSelect }: { report: HandlerReport; onSelect: (l: SourceLocation) => void }) {
  type Item = { order: number; node: React.ReactNode };
  const items: Item[] = [
    ...report.checks.map((c) => ({
      order: c.order,
      node: <Row key={`c${c.order}`} mark="✔" tone="text-ok" kind="verify" title={c.callee} loc={c.location} note="signature check" onSelect={onSelect} />,
    })),
    ...report.guards.map((g) => ({
      order: g.order,
      node: (
        <Row
          key={`g${g.order}`}
          mark="◆"
          tone={g.atomic === false ? "text-warning" : "text-info"}
          kind="guard"
          title={g.description}
          loc={g.location}
          note={`${g.kind}, ${guardNote(g)}`}
          noteTone={g.atomic === false ? "text-warning" : undefined}
          onSelect={onSelect}
        />
      ),
    })),
    ...report.effects.map((e) => {
      const flagged = report.findings.filter((f) => f.effect && f.effect.order === e.order);
      const s = effectStatus(e, flagged);
      return {
        order: e.order,
        node: (
          <Row
            key={`e${e.order}`}
            mark={s.mark}
            tone={s.tone}
            kind={e.kind}
            title={e.callee}
            loc={e.location}
            via={e.path[0]}
            note={s.text}
            noteTone={flagged.length ? s.tone : undefined}
            onSelect={onSelect}
          />
        ),
      };
    }),
  ].sort((a, b) => a.order - b.order);

  if (!items.length) return <p className="px-4 py-3 text-sm text-muted">No effects found.</p>;
  return <ul>{items.map((i) => i.node)}</ul>;
}

function Excerpt({ excerpt, line }: { excerpt: NonNullable<Finding["excerpt"]>; line: number }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code py-2 font-mono text-xs leading-5">
      {excerpt.lines.map((text, i) => {
        const n = excerpt.startLine + i;
        return (
          <div key={n} className={`flex px-3 ${n === line ? "bg-error-soft" : ""}`}>
            <span className="mr-4 w-8 shrink-0 text-right text-muted select-none">{n}</span>
            <span className={n === line ? "text-fg" : "text-muted"}>{text || " "}</span>
          </div>
        );
      })}
    </pre>
  );
}

const SEVERITY_BAR = { error: "bg-error", warning: "bg-warning", info: "bg-info" } as const;

function FindingCard({ f, onSelect, isNew }: { f: Finding; onSelect: (l: SourceLocation) => void; isNew?: boolean }) {
  return (
    <div className={`relative border-t border-border px-4 py-4 transition-colors duration-1000 ${isNew ? "bg-accent-soft/60" : ""}`}>
      <span aria-hidden className={`absolute top-4 bottom-4 left-0 w-[3px] rounded-r-full ${SEVERITY_BAR[f.severity]}`} />
      <div className="flex flex-wrap items-center gap-2">
        {isNew && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">New</span>}
        <SeverityBadge severity={f.severity} />
        <Link href={`/rules/${f.rule}`} className="font-mono text-sm font-medium hover:text-accent">
          {f.rule}
        </Link>
        <ConfidenceBadge confidence={f.confidence} />
        <LocationButton loc={f.location} onSelect={onSelect} />
      </div>
      <p className="mt-2 text-sm">{f.message}</p>
      {f.excerpt && <Excerpt excerpt={f.excerpt} line={f.location.line} />}
      <p className="mt-3 text-xs font-medium tracking-wide text-muted uppercase">Failing sequence</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        {f.failingSequence.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm">
        <span className="font-medium">Fix: </span>
        {f.fix}
      </p>
      {f.snippet && <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-code p-3 font-mono text-xs leading-5">{f.snippet}</pre>}
    </div>
  );
}

export function Results({
  result,
  onSelect,
  newFindingIds,
  hideClean,
  stagger,
}: {
  result: AnalysisResult;
  onSelect: (l: SourceLocation) => void;
  /** Findings to mark as new (live mode). */
  newFindingIds?: Set<string>;
  /** Show only handlers with findings. */
  hideClean?: boolean;
  /** Fade the handler cards in one after another. */
  stagger?: boolean;
}) {
  const attention = result.handlers.filter((h) => h.findings.length);
  const shown = hideClean ? attention : [...attention, ...result.handlers.filter((h) => !h.findings.length)];
  if (!result.handlers.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm">
        <p className="font-medium">No at-least-once handlers found.</p>
        <p className="mt-1 text-muted">
          retrysafe looks for webhook routes (a path like <code className="font-mono">/webhooks/…</code>, a signature check, or a delivery-id header), queue workers, and Lambda
          event consumers. Ordinary routes are skipped on purpose.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {result.handlers.length} handler{result.handlers.length === 1 ? "" : "s"} found;{" "}
        {attention.length ? (
          <span className="text-fg">
            {attention.length} need{attention.length === 1 ? "s" : ""} attention ({result.findings.length} finding{result.findings.length === 1 ? "" : "s"}).
          </span>
        ) : (
          <span className="text-ok">no findings.</span>
        )}
      </p>
      {shown.map((h, i) => (
        <section
          key={h.handler.id}
          className={`overflow-hidden rounded-2xl border border-border bg-surface transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(20,60,160,0.35)] ${stagger ? "rise" : ""}`}
          style={stagger ? ({ "--rise-delay": `${Math.min(i, 6) * 90}ms` } as React.CSSProperties) : undefined}
        >
          <header className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-accent-soft to-surface-2 px-4 py-3">
            <h3 className="flex items-center gap-2 font-mono text-sm font-semibold">
              <span className={`size-2 rounded-full ${h.findings.length ? "bg-error" : "bg-ok"}`} />
              {h.handler.name}
            </h3>
            <span className="text-xs text-muted">
              {h.handler.framework}
              {h.handler.provider ? ` · ${h.handler.provider}` : ""} · <LocationButton loc={h.handler.location} onSelect={onSelect} />
            </span>
          </header>
          <EffectMap report={h} onSelect={onSelect} />
          {h.findings.map((f) => (
            <FindingCard key={f.id} f={f} onSelect={onSelect} isNew={newFindingIds?.has(f.id)} />
          ))}
        </section>
      ))}
    </div>
  );
}
