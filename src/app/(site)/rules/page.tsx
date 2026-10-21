import type { Metadata } from "next";
import Link from "next/link";
import { SeverityBadge } from "@/components/badges";
import { RULES } from "@/lib/rules";

export const metadata: Metadata = { title: "Rules", description: "Every retrysafe rule: what it detects, why it goes wrong, and the safe pattern." };

const ORDER = { error: 0, warning: 1, info: 2 } as const;

export default function RulesPage() {
  const rules = [...RULES].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.id.localeCompare(b.id));
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Rules</h1>
      <p className="mt-3 text-muted">
        Each rule names one way a handler goes wrong when it runs twice or stops halfway. Configure them in <code className="font-mono text-sm">retrysafe.config.ts</code>{" "}
        (<code className="font-mono text-sm">{'rules: { "rule-id": "off" }'}</code>) or silence one line with{" "}
        <code className="font-mono text-sm">{"// retrysafe-ignore <rule> -- <reason>"}</code>.
      </p>
      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {rules.map((r) => (
          <li key={r.id}>
            <Link href={`/rules/${r.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-2">
              <div className="w-20 shrink-0 pt-0.5">
                <SeverityBadge severity={r.severity} />
              </div>
              <div>
                <code className="font-mono text-sm font-medium">{r.id}</code>
                <p className="mt-1 text-sm text-muted">{r.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
