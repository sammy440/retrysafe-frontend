import type { Metadata } from "next";
import { Suspense } from "react";
import { Playground } from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "Playground",
  description: "Paste a webhook handler or queue worker and see its effect map and what a retry would break.",
};

export default function PlaygroundPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
      {/* The playground reads ?example= from the URL, which is only known in the browser. */}
      <Suspense fallback={<div className="h-[560px] animate-pulse rounded-xl border border-border bg-surface" />}>
        <Playground />
      </Suspense>
    </main>
  );
}
