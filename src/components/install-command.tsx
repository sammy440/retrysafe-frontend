"use client";

import { useEffect, useState } from "react";

export const NPM_URL = "https://www.npmjs.com/package/retrysafe";

const MANAGERS = [
  { id: "npx", label: "npx", command: "npx retrysafe" },
  { id: "npm", label: "npm", command: "npm install --save-dev retrysafe" },
  { id: "pnpm", label: "pnpm", command: "pnpm add -D retrysafe" },
  { id: "yarn", label: "yarn", command: "yarn add -D retrysafe" },
] as const;

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return [
    copied,
    (text) => {
      void navigator.clipboard?.writeText(text).then(() => setCopied(true));
    },
  ];
}

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 3.5A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 3.5 10.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** A single command with a copy button. `glass` sits on the landing page's sky backdrop. */
export function CopyCommand({ command, tone = "plain", className = "" }: { command: string; tone?: "plain" | "glass"; className?: string }) {
  const [copied, copy] = useCopy();
  const styles =
    tone === "glass"
      ? "rounded-full border border-white/70 bg-white/55 py-[8px] pr-[8px] pl-5 text-[14px] text-[#0f1b3d] backdrop-blur-sm"
      : "rounded-lg border border-border bg-surface-2 py-1 pr-1 pl-3 text-[13px]";
  return (
    <span className={`inline-flex items-center gap-3 font-mono ${styles} ${className}`}>
      <span>
        <span className="opacity-50 select-none">$ </span>
        {command}
      </span>
      <button
        type="button"
        onClick={() => copy(command)}
        aria-label={copied ? "Copied" : `Copy ${command}`}
        className={`grid size-7 place-items-center rounded-full transition-colors ${copied ? "text-ok" : "opacity-60 hover:bg-black/5 hover:opacity-100"}`}
      >
        <CopyIcon copied={copied} />
      </button>
    </span>
  );
}

/** Install instructions with a tab per package manager. */
export function InstallTabs() {
  const [active, setActive] = useState<(typeof MANAGERS)[number]["id"]>("npx");
  const [copied, copy] = useCopy();
  const command = MANAGERS.find((m) => m.id === active)!.command;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-code">
      <div className="flex items-center gap-1 border-b border-border px-2 pt-1.5" role="tablist" aria-label="Package manager">
        {MANAGERS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === active}
            onClick={() => setActive(m.id)}
            className={`-mb-px border-b-2 px-2.5 py-1.5 font-mono text-xs transition-colors ${
              m.id === active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {m.label}
          </button>
        ))}
        <a href={NPM_URL} className="ml-auto pr-1 pb-1 text-xs text-muted hover:text-accent">
          npm ↗
        </a>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <code key={active} className="fade-in flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
          <span className="text-muted select-none">$ </span>
          {command}
        </code>
        <button
          type="button"
          onClick={() => copy(command)}
          aria-label={copied ? "Copied" : "Copy command"}
          className={`flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs transition-colors ${copied ? "text-ok" : "text-muted hover:text-fg"}`}
        >
          <CopyIcon copied={copied} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
