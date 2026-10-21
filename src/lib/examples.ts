/** Playground starting points: small multi-file projects, each showing one failure (or the fix). */
export interface Example {
  id: string;
  title: string;
  summary: string;
  files: Record<string, string>;
}

const prismaLib = `import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
`;

const stripeLib = `import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
`;

export const EXAMPLES: Example[] = [
  {
    id: "stripe-unguarded",
    title: "Stripe webhook, no guard",
    summary: "A retried checkout event creates a second order and sends a second receipt.",
    files: {
      "app/api/webhooks/stripe/route.ts": `import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendReceipt } from "@/lib/mail";

export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get("stripe-signature")!,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = await prisma.order.create({
      data: { stripeSessionId: session.id, email: session.customer_email },
    });
    await sendReceipt(session.customer_email, order.id);
  }

  return Response.json({ received: true });
}
`,
      "lib/mail.ts": `import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceipt(to: string, orderId: string) {
  await resend.emails.send({ from: "shop@example.com", to, subject: "Your receipt", html: \`Order \${orderId}\` });
}
`,
      "lib/db.ts": prismaLib,
      "lib/stripe.ts": stripeLib,
      "tsconfig.json": `{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] } }, "include": ["**/*.ts"] }\n`,
    },
  },
  {
    id: "safe-transaction",
    title: "The safe pattern",
    summary: "The event id is claimed in the same transaction as the writes: retries, races, and crashes are all safe.",
    files: {
      "app/api/webhooks/stripe/route.ts": `import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get("stripe-signature")!,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    await prisma.$transaction(async (tx) => {
      // Primary key on id: a retry fails here and nothing below commits twice.
      await tx.processedEvent.create({ data: { id: event.id } });
      await tx.account.update({
        where: { stripeCustomerId: String(invoice.customer) },
        data: { credits: { increment: 100 } },
      });
    });
  }

  return Response.json({ received: true });
}
`,
      "prisma/schema.prisma": `model ProcessedEvent {
  id          String   @id
  processedAt DateTime @default(now())
}

model Account {
  id               Int    @id @default(autoincrement())
  stripeCustomerId String @unique
  credits          Int    @default(0)
}
`,
      "lib/db.ts": prismaLib,
      "lib/stripe.ts": stripeLib,
      "tsconfig.json": `{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] } }, "include": ["**/*.ts"] }\n`,
    },
  },
  {
    id: "record-first",
    title: "Record first, then work",
    summary: "Redis SET NX stops duplicates, but a crash after the claim loses the wallet credit for good.",
    files: {
      "src/server.ts": `import express from "express";
import crypto from "node:crypto";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

const app = express();
const redis = new Redis(process.env.REDIS_URL!);
const prisma = new PrismaClient();

app.post("/webhooks/paystack", express.json(), async (req, res) => {
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET!).update(JSON.stringify(req.body)).digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) return res.sendStatus(401);

  const event = req.body;
  const claimed = await redis.set(\`paystack:\${event.data.id}\`, "1", "EX", 3600, "NX");
  if (!claimed) return res.sendStatus(200);

  await prisma.wallet.update({
    where: { userId: event.data.metadata.userId },
    data: { balance: { increment: event.data.amount } },
  });
  res.sendStatus(200);
});

app.listen(3000);
`,
    },
  },
  {
    id: "lookup-race",
    title: "Check, then insert",
    summary: "Looking the event up before inserting it lets two concurrent deliveries both through.",
    files: {
      "src/routes/github.ts": `import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { Octokit } from "@octokit/rest";

const router = Router();
const prisma = new PrismaClient();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

router.post("/webhooks/github", async (req, res) => {
  const delivery = req.headers["x-github-delivery"] as string;
  const seen = await prisma.webhookEvent.findUnique({ where: { id: delivery } });
  if (seen) return res.sendStatus(200);

  await octokit.issues.createComment({
    owner: req.body.repository.owner.login,
    repo: req.body.repository.name,
    issue_number: req.body.issue.number,
    body: "Thanks for opening this!",
  });
  await prisma.webhookEvent.create({ data: { id: delivery } });
  res.sendStatus(200);
});

export default router;
`,
    },
  },
  {
    id: "queue-worker",
    title: "BullMQ worker",
    summary: "A retried job enqueues its follow-up again and charges without an idempotency key.",
    files: {
      "src/worker.ts": `import { Queue, Worker } from "bullmq";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const followups = new Queue("followups");

new Worker("invoices", async (job) => {
  await stripe.paymentIntents.create({
    amount: job.data.amount,
    currency: "usd",
    customer: job.data.customer,
    confirm: true,
  });
  await followups.add("thank-you", { customer: job.data.customer });
});
`,
    },
  },
];
