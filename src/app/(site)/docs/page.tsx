import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Docs", description: "Install retrysafe, run it in CI, fix findings, and use the @retrysafe/guard runtime library." };

function Code({ children }: { children: string }) {
  return <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-sm leading-6">{children}</pre>;
}

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Docs</h1>
      <p className="mt-3 text-muted">
        retrysafe is a CLI. It needs no install and no account, and it never sends your code anywhere: the{" "}
        <Link href="/playground" className="text-accent underline underline-offset-2">
          playground
        </Link>{" "}
        is the only part that runs on a server.
      </p>

      <Link href="/docs/patterns" className="mt-8 block rounded-xl border border-border bg-surface p-5 hover:border-accent">
        <p className="font-semibold">Safe patterns for handlers that run more than once →</p>
        <p className="mt-1 text-sm text-muted">Choosing a key, claiming in a transaction, leases for external calls, status codes, ack timing.</p>
      </Link>

      <h2 className="mt-12 text-xl font-semibold">Run it</h2>
      <Code>{`npx retrysafe                      # analyze the current project
npx retrysafe --handlers           # list discovered webhook and queue handlers
npx retrysafe --effect-map         # effect map for every handler
npx retrysafe explain <id>         # failing sequence, why, and the fix
npx retrysafe rules                # list rules`}</Code>

      <h2 className="mt-10 text-xl font-semibold">Live analysis while you edit</h2>
      <p className="mt-2 text-muted">
        Run this in your project, open the link it prints, and the{" "}
        <Link href="/live" className="text-accent underline underline-offset-2">
          Live page
        </Link>{" "}
        updates every time you save, in any editor. Analysis runs on your machine; the page connects to it on <code className="font-mono text-sm">127.0.0.1</code> with a one-time
        token, and clicking a finding opens it in VS Code, Cursor, or Windsurf.
      </p>
      <Code>{`npx retrysafe live --open
npx retrysafe live --port 5000 --site https://your-retrysafe-site.example`}</Code>

      <h2 className="mt-10 text-xl font-semibold">Fix findings</h2>
      <p className="mt-2 text-muted">
        <code className="font-mono text-sm">retrysafe fix</code> prints a diff; <code className="font-mono text-sm">--write</code> applies it. It adds idempotency keys and job ids
        derived from the event or job id, answers permanent failures with 400, and wraps handlers with a guard from{" "}
        <code className="font-mono text-sm">@retrysafe/guard</code>.
      </p>
      <Code>{`npx retrysafe fix
npx retrysafe fix --guard "@/lib/guard#guard" --write`}</Code>

      <h2 className="mt-10 text-xl font-semibold">Confirm a finding dynamically</h2>
      <p className="mt-2 text-muted">
        <code className="font-mono text-sm">verify</code> loads the handler with payment, database, email, and queue libraries stubbed, then delivers the same event twice: in a row,
        concurrently, and with a crash before each effect.
      </p>
      <Code>{`npx retrysafe verify "POST /api/webhooks/stripe"`}</Code>

      <h2 className="mt-10 text-xl font-semibold">Configure</h2>
      <Code>{`// retrysafe.config.ts  (npx retrysafe init)
import { defineConfig } from "retrysafe";

export default defineConfig({
  handlers: { add: ["src/jobs/send-invoice.ts#handler"], ignore: ["POST /api/health"] },
  guards: [{ callee: "withIdempotency", keyArg: 0, atomic: true }],
  effects: {
    extend: [{ match: { module: "@/lib/billing", callee: "chargeCustomer" }, kind: "payment", idempotent: false }],
  },
  providers: { paystack: { retryWindowHours: 72 } },
  rules: { "order-dependence-assumed": "off" },
});`}</Code>
      <p className="mt-3 text-muted">
        Adopting it in an existing codebase: record today&apos;s findings with <code className="font-mono text-sm">--update-baseline</code> so only new ones fail CI, and
        suppress single lines with <code className="font-mono text-sm">{"// retrysafe-ignore <rule> -- <reason>"}</code>.
      </p>

      <h2 className="mt-10 text-xl font-semibold">CI</h2>
      <Code>{`# .github/workflows/retrysafe.yml
on: [pull_request]
jobs:
  retrysafe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: sammy440/retrysafe/packages/action@main
        with: { fail-on: error, changed-only: "true" }`}</Code>
      <p className="mt-3 text-muted">
        Findings are annotated on the changed lines. Also available: <code className="font-mono text-sm">--format sarif</code> for code scanning,{" "}
        <code className="font-mono text-sm">--format markdown</code>, <code className="font-mono text-sm">--format json</code>, and a pre-commit hook (
        <code className="font-mono text-sm">--staged</code>).
      </p>

      <h2 className="mt-10 text-xl font-semibold">Runtime guards</h2>
      <Code>{`npm install @retrysafe/guard

import { eventKey, prismaGuard } from "@retrysafe/guard";
const guard = prismaGuard(prisma);

await guard.run(eventKey.stripe(event), async (tx) => {
  await tx.order.create({ data: { ... } });   // commits with the claim
});`}</Code>
      <p className="mt-3 text-muted">
        <code className="font-mono text-sm">postgresGuard</code> and <code className="font-mono text-sm">prismaGuard</code> claim the event in the same transaction as your writes;{" "}
        <code className="font-mono text-sm">redisGuard</code> uses a lease for external calls. retrysafe recognizes all of them.
      </p>
    </main>
  );
}
