import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RULES } from "@/lib/rules";

export const metadata: Metadata = {
  title: "Safe patterns",
  description: "How to make webhook handlers and queue workers safe to retry: keys, transactional claims, leases, status codes.",
};

const RULE_IDS = new Set(RULES.map((r) => r.id));

export default function PatternsPage() {
  // Synced from the retrysafe repo by `pnpm sync-content`; read at build time. Rule names link to their pages.
  const markdown = readFileSync(path.join(process.cwd(), "content", "patterns.md"), "utf8").replace(/`([a-z0-9-]+)`/g, (m, id: string) =>
    RULE_IDS.has(id) ? `[\`${id}\`](/rules/${id})` : m,
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/docs" className="text-sm text-muted hover:text-fg">
        ← Docs
      </Link>
      <article className="prose-doc mt-4">
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </article>
    </main>
  );
}
