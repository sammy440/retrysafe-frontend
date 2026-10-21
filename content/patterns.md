# Safe patterns for handlers that run more than once

Webhook providers and message queues deliver **at least once**. Every handler eventually sees:

- **A retry after success.** The response was slow, a deploy restarted the process, or someone pressed "resend".
- **A concurrent duplicate.** A retry arrives while the first attempt is still running.
- **A crash part-way through.** The process dies after some of the work and before the rest.

A handler is safe when all three leave the world as if the event was processed exactly once.
retrysafe's rules each point at one way this fails. This page shows the fix for each.
The [`@retrysafe/guard`](https://www.npmjs.com/package/@retrysafe/guard) package implements them as a library.

## 1. Choose the key: the event id, not the object id

| Provider | Key |
|---|---|
| Stripe | `event.id` (`evt_…`) |
| GitHub | `X-GitHub-Delivery` header |
| Shopify | `X-Shopify-Webhook-Id` header (`X-Shopify-Event-Id` is shared across subscriptions) |
| Svix senders (Clerk, Resend, …) | `svix-id` / `webhook-id` header |
| Paystack, Flutterwave | event name + `data.id` (there is no top-level event id) |
| SQS | `messageId` |
| BullMQ / Bull | `job.id` |

- **Not `event.data.object.id`.** `invoice.created` and `invoice.paid` share it, so the second event is
  dropped as a duplicate. retrysafe reports this as `wrong-event-field-as-key`.
- **Not `Date.now()`, `Math.random()`, or `uuid()`.** They change on every retry, so nothing is
  deduplicated. retrysafe reports this as `nondeterministic-key`.

## 2. Database work: claim and write in one transaction

The claim (an insert into a table whose primary key is the event key) and the handler's writes must
commit together:

```ts
await prisma.$transaction(async (tx) => {
  // A retry violates the primary key here; nothing below commits twice.
  await tx.processedEvent.create({ data: { id: event.id } });
  await tx.order.create({ data: { ... } });
  await tx.wallet.update({ where: { userId }, data: { balance: { increment: amount } } });
});
```

With `@retrysafe/guard`: `prismaGuard(prisma).run(eventKey.stripe(event), async (tx) => { ... })`, or
`postgresGuard(pool)` for `pg`.

The two tempting alternatives each fail one of the three cases:

| Pattern | Retry after success | Concurrent duplicate | Crash part-way | retrysafe rule |
|---|---|---|---|---|
| No guard | duplicates | duplicates | duplicates | `unguarded-side-effect`, `incrementing-write-unguarded` |
| `if (await findUnique(...)) return;` then work | ok | **duplicates** | duplicates if before the record | `check-then-insert-race` |
| Work, then record | ok | duplicates | **duplicates** | `effect-before-record` |
| Record (`SET NX`, insert), then work, separately | ok | ok | **loses the event** | `record-before-effect-no-tx` |
| Claim and work in one transaction | ok | ok | ok (both roll back) | none |

The claim is only atomic if the key column is unique. retrysafe reads Prisma schemas, SQL migrations,
Drizzle tables, and Mongoose schemas, and reports a processed-events table without a unique constraint.

## 3. External effects: lease, release, and provider keys

Emails, payments, and API calls cannot roll back with your database. Use two layers:

1. **A provider idempotency key** on the call itself, derived from the event:
   ```ts
   await stripe.refunds.create({ charge }, { idempotencyKey: `refund:${event.id}` });
   await resend.emails.send(email, { idempotencyKey: `welcome:${event.id}` });
   await queue.add("followup", data, { jobId: `followup:${job.id}` });
   ```
   retrysafe rules: `effect-missing-idempotency-key`, `queue-add-without-job-id`.
2. **A lease** for providers without keys (most email, SMS, and chat APIs):
   ```ts
   const result = await redisGuard(redis).run(eventKey.github(req.headers), async () => {
     await octokit.issues.createComment({ ... });
   });
   if (result.status === "in-progress") return res.sendStatus(409); // retryable
   ```
   The lease (`SET NX EX`) stops concurrent duplicates, a failure deletes it, and a crash lets it expire.

Keep dedupe keys alive longer than the provider retries: Stripe retries for 3 days, Shopify for
4 hours. retrysafe rule: `dedupe-ttl-short`.

For the strongest guarantee, use an **outbox**. Write "send this email" rows in the same transaction as
the claim, and have a worker send them with provider keys.

## 4. Answer with the right status

| Situation | Answer | Why |
|---|---|---|
| Processed | 2xx | Done |
| Duplicate | 2xx | Stop the provider retrying |
| Another attempt is in progress | 409 / 5xx | Retry later |
| The work failed (timeout, outage) | 5xx, or rethrow | Retry. Never log and return 200 (`swallowed-error-returns-2xx`) |
| Bad signature, malformed payload | 400 / 401 | Retrying cannot help (`permanent-error-returns-5xx`) |

## 5. Respond after the work, or hand it off

- **Responding first, then working.** If the work then fails, the provider already considers the
  event delivered. On serverless the function may also be frozen mid-work.
- **Unawaited promises and `forEach(async ...)`.** The same failure, less visibly.

Either await the work before responding, or persist the event and process it from a queue
(`ack-timing`).

## 6. In-code retries need stable keys

Retrying a timed-out payment call without an idempotency key charges twice if the first attempt
actually succeeded (`retry-loop-with-effect`). Compute the key once, outside the retry loop.

## 7. Events arrive out of order

A delayed `subscription.updated` can arrive after `subscription.deleted`. Store the event's timestamp
or version with the state and ignore older events, or re-fetch the object from the provider
(`order-dependence-assumed`).

## Checking your fix

```sh
npx retrysafe                                 # static analysis
npx retrysafe fix --guard "@/lib/guard#guard" # codemods (dry run; --write to apply)
npx retrysafe verify "POST /api/webhooks/stripe"  # deliver twice, concurrently, and with crashes
```
