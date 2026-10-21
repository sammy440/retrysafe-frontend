import type { Confidence, Severity } from "@/lib/api";

const SEVERITY: Record<Severity, string> = {
  error: "bg-error-soft text-error",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY[severity]}`}>{severity}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">{confidence} confidence</span>;
}
