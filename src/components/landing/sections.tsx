import Image from "next/image";
import Link from "next/link";
import { CopyCommand, NPM_URL } from "@/components/install-command";
import { Reveal } from "@/components/motion/reveal";
import type { RuleDoc } from "@/lib/rules";
import { Terminal } from "./terminal";

const LIFT = "transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(30,60,150,0.35)]";

/** Small mono label above section titles, the light-surface twin of the hero badge. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-block rounded-[5px] border border-accent/25 bg-accent-soft px-[7px] py-[2px] font-mono text-[11.5px] tracking-[0.06em] text-accent uppercase">
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, title, body, center }: { eyebrow: string; title: React.ReactNode; body?: React.ReactNode; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.02] font-medium tracking-[-0.045em] text-fg">{title}</h2>
      {body && <p className="mt-4 text-[17px] leading-7 text-muted">{body}</p>}
    </Reveal>
  );
}

/* ---------- 1. What every handler eventually sees ---------- */

const DELIVERIES = [
  {
    title: "Retry after success",
    body: "The response was slow or a deploy restarted the process. The provider sends the same event again, and every unguarded effect happens twice.",
    lanes: [
      [{ t: "evt_1", w: 46, tone: "bg-[#2563eb]" }, { t: "timeout", w: 30, tone: "bg-[#c7d8f5] text-[#2b4a86] dark:bg-[#24366b] dark:text-[#b9cdf5]" }],
      [{ t: "", w: 34, tone: "" }, { t: "evt_1 again", w: 58, tone: "bg-[#2563eb]" }],
    ],
  },
  {
    title: "Two copies at once",
    body: "A retry lands while the first attempt is still running. Both read “not processed yet”, and both charge the card.",
    lanes: [
      [{ t: "evt_1 · check → work", w: 82, tone: "bg-[#2563eb]" }],
      [{ t: "", w: 10, tone: "" }, { t: "evt_1 · check → work", w: 80, tone: "bg-[#5aa7f7]" }],
    ],
  },
  {
    title: "A crash part-way",
    body: "Record first and a crash loses the event. Work first and a crash duplicates it. Only one pattern survives both.",
    lanes: [
      [{ t: "record", w: 30, tone: "bg-[#2563eb]" }, { t: "✕ crash", w: 26, tone: "bg-[#ffd9cc] text-[#b42318] dark:bg-[#3a1d18] dark:text-[#ff8a6b]" }],
      [{ t: "", w: 34, tone: "" }, { t: "retry → skipped", w: 52, tone: "bg-[#c7d8f5] text-[#2b4a86] dark:bg-[#24366b] dark:text-[#b9cdf5]" }],
    ],
  },
];

export function Deliveries() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <SectionTitle
        eyebrow="At-least-once delivery"
        title={
          <>
            Your handler will run twice.
            <br className="hidden sm:block" /> The question is what it does then.
          </>
        }
        body="Stripe, GitHub, Shopify, SQS, and every queue retry until they get an acknowledgement. Three situations happen to every handler, eventually."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {DELIVERIES.map((d, n) => (
          <Reveal as="article" key={d.title} delay={n * 110} className={`rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(16,40,100,0.04)] ${LIFT}`}>
            <div className="space-y-2 rounded-xl bg-surface-2 p-3">
              {d.lanes.map((lane, i) => (
                <div key={i} className="flex h-7 gap-1.5">
                  {lane.map((seg, j) => (
                    <span
                      key={j}
                      // Segments play in order (lane by lane), hold, then the sequence replays.
                      style={{ width: `${seg.w}%`, animationDelay: `${(i * 2 + j) * 0.45 + n * 0.3}s` }}
                      className={`flex items-center truncate rounded-md px-2 font-mono text-[11px] ${seg.tone ? `lane-seg ${seg.tone} ${seg.tone.includes("text-") ? "" : "text-white"}` : ""}`}
                    >
                      {seg.t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-lg font-medium tracking-[-0.02em]">{d.title}</h3>
            <p className="mt-2 text-[15px] leading-6 text-muted">{d.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- 2. Two mistakes, one safe pattern ---------- */

const PATTERNS = [
  {
    tag: "Loses events",
    tone: "text-error bg-error-soft",
    title: "Record first, then work",
    code: `const ok = await redis.set(key, 1, "NX");
if (!ok) return;
await credit(wallet); // crash → lost`,
    note: "Safe against duplicates. A crash after the claim marks the event done with the work undone.",
    rule: "record-before-effect-no-tx",
  },
  {
    tag: "Duplicates",
    tone: "text-warning bg-warning-soft",
    title: "Work first, then record",
    code: `if (await seen(evt.id)) return;
await sendEmail(user); // crash → twice
await markSeen(evt.id);`,
    note: "Safe against loss. A crash before the record, or a concurrent copy, repeats the work.",
    rule: "effect-before-record",
  },
  {
    tag: "Safe",
    tone: "text-ok bg-ok-soft",
    title: "Claim and work in one transaction",
    code: `await db.$transaction(async (tx) => {
  await tx.processed.create({ id });
  await tx.wallet.update(credit);
});`,
    note: "A duplicate fails the unique claim; a crash rolls back both. Use idempotency keys for external calls.",
    rule: undefined,
  },
];

export function Patterns() {
  return (
    <section className="border-y border-border bg-surface-2/60">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionTitle
          eyebrow="The trap"
          title="Two common fixes, and why each one fails"
          body="Adding a dedupe check swaps one bug for the other. retrysafe checks which side of the trap each handler is on, and whether its guard is really atomic."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PATTERNS.map((p, n) => (
            <Reveal as="article" key={p.title} delay={n * 110} className={`flex flex-col rounded-2xl border border-border bg-surface p-6 ${LIFT}`}>
              <span className={`self-start rounded-md px-2 py-0.5 text-xs font-medium ${p.tone}`}>{p.tag}</span>
              <h3 className="mt-4 text-lg font-medium tracking-[-0.02em]">{p.title}</h3>
              <pre className="mt-4 rounded-xl border border-border bg-code p-4 font-mono text-[12px] leading-6 break-words whitespace-pre-wrap">{p.code}</pre>
              <p className="mt-4 flex-1 text-[15px] leading-6 text-muted">{p.note}</p>
              {p.rule && (
                <Link href={`/rules/${p.rule}`} className="mt-4 font-mono text-[13px] text-accent hover:underline">
                  {p.rule} →
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. How it works ---------- */

const STEPS = [
  { title: "Finds the handlers", body: "Webhook routes in Express, Fastify, and Next.js; BullMQ, SQS, and Lambda consumers; Probot apps. No list to maintain." },
  { title: "Maps every effect", body: "Follows calls through your own code to payments, emails, writes, queue publishes, and API calls, and knows which are idempotent." },
  { title: "Checks the guards", body: "Unique inserts, SET NX, idempotency keys, transactions, and your schema's unique constraints, and the order they run in." },
  { title: "Explains the fix", body: "Each finding has a failing sequence, the safe pattern for the library you use, and a codemod that applies it." },
];

const dim = (t: string) => <span className="text-white/45">{t}</span>;
const ok = <span className="text-[#7ee2a8]">✔</span>;
const bad = <span className="text-[#ff9b85]">✖</span>;

const TERMINAL: { prompt?: boolean; text?: string; content: React.ReactNode }[] = [
  { prompt: true, text: "npx retrysafe", content: <><span className="text-white/50">$ </span>npx retrysafe</> },
  { content: "" },
  { content: <><span className="text-white">POST /api/webhooks/stripe</span>{dim("   route.ts:6")}</> },
  { content: dim("  Effect map") },
  { content: <>{"    "}{ok}{" verify    stripe.webhooks.constructEvent"}</> },
  { content: <>{"    "}{bad}{" db-write  prisma.order.create   "}{dim("no guard")}</> },
  { content: <>{"    "}{bad}{" email     resend.emails.send    "}{dim("no guard")}</> },
  { content: "" },
  { content: <><span className="text-[#ff9b85]">{"  ✖ unguarded-side-effect"}</span>{dim("  error · high confidence")}</> },
  { content: "    1. Stripe delivers evt_1; handler creates the order" },
  { content: "    2. The response is slow; Stripe retries evt_1" },
  { content: "    3. A second order is created" },
  { content: <><span className="text-[#9cc4ff]">{"    Fix: "}</span>claim event.id in the same transaction</> },
  { content: "" },
  { prompt: true, text: "npx retrysafe fix --guard @/lib/guard#guard --write", content: <><span className="text-white/50">$ </span>npx retrysafe fix --guard @/lib/guard#guard --write</> },
  { content: <>{"  "}{ok}{" wrapped POST /api/webhooks/stripe in guard.run(...)"}</> },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionTitle eyebrow="How it works" title="Reads your code the way a careful reviewer would" />
          <ol className="mt-10 space-y-6">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 100} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#4aa3ff] to-[#1f6fe5] text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium tracking-[-0.01em]">{s.title}</p>
                  <p className="mt-1 text-[15px] leading-6 text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
        {/* Terminal in the hero's indigo-to-blue sky. */}
        <Reveal delay={150} className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#222680_0%,#2c48b4_55%,#3b6fd8_100%)] p-[1px] shadow-[0_30px_60px_-30px_rgba(30,50,140,0.6)]">
          <div className="rounded-[15px] bg-[linear-gradient(180deg,rgba(18,22,80,0.55),rgba(20,40,120,0.35))] p-5">
            <div className="mb-4 flex gap-1.5">
              <span className="size-2.5 rounded-full bg-white/25" />
              <span className="size-2.5 rounded-full bg-white/25" />
              <span className="size-2.5 rounded-full bg-white/25" />
            </div>
            <Terminal lines={TERMINAL} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 4. Rules ---------- */

const DOT = { error: "bg-[#e5484d]", warning: "bg-[#f5a524]", info: "bg-[#5aa7f7]" } as const;

export function Rules({ rules }: { rules: RuleDoc[] }) {
  const shown = rules.slice(0, 9);
  return (
    <section className="border-y border-border bg-surface-2/60">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle
            eyebrow={`${rules.length} rules`}
            title="Every finding comes with a failing sequence and a fix"
            body="From unguarded payments to dedupe keys that expire before the provider stops retrying."
          />
          <Link href="/rules" className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent">
            Browse all rules →
          </Link>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r, i) => (
            <Reveal as="li" key={r.id} delay={(i % 3) * 80 + Math.floor(i / 3) * 60}>
              <Link href={`/rules/${r.id}`} className={`group block h-full rounded-2xl border border-border bg-surface p-5 hover:border-accent/50 ${LIFT}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${DOT[r.severity]}`} />
                  <code className="font-mono text-[13px] font-medium group-hover:text-accent">{r.id}</code>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{r.summary}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 5. What ships ---------- */

const TOOLS = [
  {
    title: "The CLI",
    body: "Run it in any Node or TypeScript repo. Config, baselines, inline suppressions, SARIF, JSON, and Markdown output.",
    code: "npx retrysafe\nnpx retrysafe explain <id>\nnpx retrysafe verify <handler>",
    href: "/docs",
  },
  {
    title: "GitHub Action",
    body: "Annotates the exact lines in pull requests and only checks handlers the diff touches.",
    code: "- uses: sammy440/retrysafe/packages/action@main\n  with:\n    fail-on: error",
    href: "/docs",
  },
  {
    title: "@retrysafe/guard",
    body: "Runtime guards that claim each event with your writes, or lease it for external calls. retrysafe recognizes them.",
    code: "await guard.run(eventKey.stripe(event),\n  async (tx) => { /* once */ });",
    href: "/docs/patterns",
  },
];

export function Tools() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <SectionTitle eyebrow="What ships" title="Find it, fix it, keep it fixed" center />
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {TOOLS.map((t, n) => (
          <Reveal key={t.title} delay={n * 110}>
          <Link href={t.href} className={`group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 hover:border-accent/50 ${LIFT}`}>
            <h3 className="text-lg font-medium tracking-[-0.02em] group-hover:text-accent">{t.title}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-6 text-muted">{t.body}</p>
            <pre className="mt-5 rounded-xl border border-border bg-code p-4 font-mono text-[12px] leading-6 break-all whitespace-pre-wrap">{t.code}</pre>
          </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- 6. Closing banner, back in the sky ---------- */

export function ClosingCta() {
  return (
    <section className="px-2.5 pb-2.5 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
      <div className="relative isolate overflow-hidden rounded-[20px] sm:rounded-[26px]">
        <Image src="/background.jpg" alt="" fill sizes="100vw" className="-z-20 scale-110 object-cover object-[50%_80%] blur-[5px]" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(242,246,252,0.95) 0%, rgba(190,215,248,0.35) 34%, rgba(70,130,225,0.35) 70%, rgba(44,72,180,0.82) 100%)",
          }}
        />
        <Reveal className="px-6 py-[clamp(72px,10vw,130px)] text-center">
          <h2 className="mx-auto max-w-3xl text-[clamp(2.1rem,4.4vw,3.8rem)] leading-[0.98] font-medium tracking-[-0.05em] text-[#0f1b3d]">
            See what a retry would break,
            <br className="hidden sm:block" /> before a retry does
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-7 text-[#2a3a63]">Paste a handler into the playground, or run it on your whole repo in one command.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/playground" className="rounded-full bg-white px-[30px] py-[13px] text-[16px] text-[#141a2b] shadow-[0_8px_24px_-8px_rgba(20,40,120,0.45)] transition-transform hover:-translate-y-px">
              Try the Playground
            </Link>
            <CopyCommand command="npx retrysafe" tone="glass" />
          </div>
          <a href={NPM_URL} className="mt-4 inline-block text-[13px] text-[#2a3a63] underline-offset-4 hover:underline">
            or <span className="font-mono">npm install -D retrysafe</span> · view on npm ↗
          </a>
        </Reveal>
      </div>
    </section>
  );
}
