import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeverityBadge } from "@/components/badges";
import { RULES, RULE_EXAMPLES, getRule } from "@/lib/rules";

export function generateStaticParams() {
  return RULES.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps<"/rules/[id]">): Promise<Metadata> {
  const rule = getRule((await params).id);
  return rule ? { title: rule.id, description: rule.summary } : {};
}

export default async function RulePage({ params }: PageProps<"/rules/[id]">) {
  const { id } = await params;
  const rule = getRule(id);
  if (!rule) notFound();
  const example = RULE_EXAMPLES[rule.id];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/rules" className="text-sm text-muted hover:text-fg">
        ← All rules
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{rule.id}</h1>
        <SeverityBadge severity={rule.severity} />
      </div>
      <p className="mt-4 text-lg leading-8">{rule.summary}</p>

      <h2 className="mt-10 text-lg font-semibold">Why it goes wrong</h2>
      <p className="mt-2 leading-7 text-muted">{rule.why}</p>

      <h2 className="mt-8 text-lg font-semibold">Safe pattern</h2>
      <p className="mt-2 leading-7 text-muted">{rule.safePattern}</p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {example && (
          <Link href={`/playground?example=${example}`} className="rounded-xl border border-border bg-surface p-4 hover:border-accent">
            <p className="font-medium">See it in the playground →</p>
            <p className="mt-1 text-sm text-muted">An example handler that triggers this rule.</p>
          </Link>
        )}
        <Link href="/docs/patterns" className="rounded-xl border border-border bg-surface p-4 hover:border-accent">
          <p className="font-medium">Safe patterns guide →</p>
          <p className="mt-1 text-sm text-muted">Keys, transactions, leases, and status codes.</p>
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Configure</h2>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-sm leading-6">
        {`// retrysafe.config.ts
export default defineConfig({
  rules: { "${rule.id}": "${rule.severity}" }, // or "off"
});

// or, for one line (a reason is required):
// retrysafe-ignore ${rule.id} -- <why this is safe>`}
      </pre>
    </main>
  );
}
