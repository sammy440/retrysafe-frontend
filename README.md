# retrysafe-frontend

The retrysafe website: landing page, rule docs, the safe-patterns guide, and the playground.
Next.js 16 (App Router, Cache Components) and Tailwind CSS 4.

```sh
npx pnpm@10 install
cp .env.example .env.local          # NEXT_PUBLIC_RETRYSAFE_API_URL
npx pnpm@10 dev                     # http://localhost:3000
```

The playground calls the API in `retrysafe-backend/api`. Start it with `pnpm dev` there, and include this site's origin in its `ALLOWED_ORIGINS`.

## Content

`content/rules.json` and `content/patterns.md` are generated. Refresh them after rules or the guide change:

```sh
RETRYSAFE_API_URL=http://localhost:8787 RETRYSAFE_REPO=../retrySafe npx pnpm@10 sync-content
```

Rule pages are prerendered from `rules.json`. Unknown rule ids return a 404 via `src/proxy.ts`.

## Layout

```
src/app/                 pages: /, /playground, /rules, /rules/[id], /docs, /docs/patterns
src/components/          site chrome, badges, playground (editor, results)
src/lib/api.ts           API client and result types
src/lib/examples.ts      playground examples
src/lib/rules.ts         rule docs + which example demonstrates each rule
```
