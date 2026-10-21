import Link from "next/link";
import { CopyCommand } from "./install-command";
import { Logo } from "./logo";

const NAV = [
  { href: "/playground", label: "Playground" },
  { href: "/live", label: "Live" },
  { href: "/rules", label: "Rules" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-medium tracking-[-0.02em] text-fg">
          <Logo className="size-6 text-accent" />
          retrysafe
        </Link>
        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:px-3">
              {n.label}
            </Link>
          ))}
          <a href="https://github.com/sammy440/retrysafe" className="hidden rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:block">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

const FOOTER = [
  { title: "Product", links: [["Playground", "/playground"], ["Live", "/live"], ["Rules", "/rules"], ["Docs", "/docs"]] },
  { title: "Learn", links: [["Safe patterns", "/docs/patterns"], ["CLI reference", "/docs"], ["npm", "https://www.npmjs.com/package/retrysafe"], ["GitHub", "https://github.com/sammy440/retrysafe"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1fr_auto_auto] sm:gap-16 sm:px-6">
        <div>
          <Link href="/" className="flex items-center gap-2.5 font-medium tracking-[-0.02em]">
            <Logo className="size-6 text-accent" />
            retrysafe
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Static analysis for webhook handlers and queue workers that run more than once.</p>
          <CopyCommand command="npx retrysafe" className="mt-4" />
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-muted transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">MIT licensed. Your code stays on your machine; only the playground sends code to a server, and it is never stored or run.</p>
      </div>
    </footer>
  );
}
