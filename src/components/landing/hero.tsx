import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { OverviewCard } from "./overview-card";

const NAV = [
  { href: "/", label: "Home", active: true },
  { href: "/playground", label: "Playground" },
  { href: "/live", label: "Live" },
  { href: "/rules", label: "Rules" },
  { href: "/docs", label: "Docs" },
  { href: "https://github.com/sammy440/retrysafe", label: "GitHub" },
];

export function Hero() {
  return (
    <section className="px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:px-5 lg:pt-5">
      <div className="relative isolate overflow-hidden rounded-t-[20px] sm:rounded-t-[26px]">
        {/* Sky photo, deepened to indigo at the top and fading to cloud-white at the bottom. */}
        <Image src="/background.jpg" alt="" fill priority sizes="100vw" className="-z-20 scale-110 object-cover object-[50%_90%] blur-[5px]" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: [
              "linear-gradient(180deg, rgba(34,36,126,0.97) 0%, rgba(42,60,168,0.88) 14%, rgba(52,92,200,0.62) 30%, rgba(64,128,226,0.3) 46%, rgba(255,255,255,0) 60%)",
              // Ends exactly on the page background, so the frame dissolves into the page below.
              "linear-gradient(0deg, var(--bg) 0%, var(--bg) 3%, color-mix(in srgb, var(--bg) 88%, transparent) 10%, rgb(var(--hero-haze) / 0.7) 20%, rgb(var(--hero-haze) / 0.3) 32%, rgb(var(--hero-haze) / 0) 46%)",
              "radial-gradient(38% 48% at 2% 66%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 75%)",
              "radial-gradient(36% 46% at 98% 64%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0) 75%)",
              "radial-gradient(30% 22% at 12% 32%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
            ].join(","),
          }}
        />
        {/* Cool the photo's cyan toward the reference's periwinkle mid-sky. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 mix-blend-color"
          style={{ background: "linear-gradient(180deg, rgba(60,80,200,0) 20%, rgba(70,105,215,0.45) 42%, rgba(80,120,220,0.3) 62%, rgba(80,120,220,0) 80%)" }}
        />
        {/* Faint scan lines across the deep blue, as in the reference. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[40%] opacity-[0.035] [mask-image:linear-gradient(180deg,black,transparent)]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 1px, transparent 1px, transparent 4px)" }}
        />

        <nav className="relative flex items-center justify-between px-4 pt-4 sm:px-[22px] sm:pt-[17px]">
          <Link href="/" aria-label="retrysafe home">
            <Logo className="size-8" color="white" />
          </Link>
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-[10px] md:flex">
            {NAV.map((n) => (
              <li key={n.label}>
                <Link
                  href={n.href}
                  aria-current={n.active ? "page" : undefined}
                  className={
                    n.active
                      ? "block rounded-[9px] border border-white/35 bg-white/[0.08] px-[13px] py-[5px] text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                      : "block px-[13px] py-[5px] text-[15px] text-white/60 transition-colors hover:text-white"
                  }
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/playground"
            className="rounded-[9px] border border-white/35 bg-white/[0.08] px-[15px] py-[6px] text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            Open Playground
          </Link>
        </nav>

        <div className="relative px-5 pt-[clamp(72px,11vw,150px)] pb-[clamp(110px,14vw,200px)] text-center">
          <p className="rise inline-block rounded-[5px] border border-white/30 bg-white/[0.06] px-[7px] py-[2px] font-mono text-[11px] tracking-[0.06em] text-white/90 uppercase sm:text-[12.5px]">
            Built for at-least-once delivery
          </p>
          <h1 className="rise mx-auto mt-[14px] [--rise-delay:90ms] text-[clamp(2.35rem,4.6vw,5.4rem)] leading-[0.95] font-medium tracking-[-0.055em] text-balance text-white">
            {/* Two fixed lines from sm up, as in the design; one balanced sentence on phones. */}
            <span className="sm:block sm:whitespace-nowrap">Ship webhooks that are </span>
            <span className="sm:block sm:whitespace-nowrap">safe to run twice</span>
          </h1>
          <Link
            href="/playground"
            className="rise mt-[30px] inline-block rounded-full [--rise-delay:180ms] bg-white px-[30px] py-[13px] text-[16px] tracking-[-0.01em] text-[#141a2b] shadow-[0_8px_24px_-8px_rgba(20,40,120,0.45)] transition-transform hover:-translate-y-px"
          >
            Try the Playground
          </Link>
          <div className="rise mt-[clamp(48px,6vw,82px)] [--rise-delay:300ms]">
            <OverviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
