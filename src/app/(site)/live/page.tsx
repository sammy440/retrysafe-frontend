import type { Metadata } from "next";
import { LivePanel } from "@/components/live/live";

export const metadata: Metadata = {
  title: "Live",
  description: "Connect the project in your editor: retrysafe re-analyzes on every save, locally, and shows the results here.",
};

export default function LivePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <LivePanel />
    </main>
  );
}
