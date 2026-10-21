// Pull rule docs from the retrysafe API and the safe-patterns guide from the retrysafe repo into content/.
// Usage: RETRYSAFE_API_URL=http://localhost:8787 RETRYSAFE_REPO=../retrySafe pnpm sync-content
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const api = process.env.RETRYSAFE_API_URL ?? process.env.NEXT_PUBLIC_RETRYSAFE_API_URL ?? "http://localhost:8787";
const repo = path.resolve(process.env.RETRYSAFE_REPO ?? "../retrySafe");

const res = await fetch(`${api}/v1/rules`).catch((err) => {
  console.error(`Could not reach ${api}/v1/rules (${err.message}). Start the API (retrysafe-backend: pnpm dev) or set RETRYSAFE_API_URL.`);
  process.exit(1);
});
if (!res.ok) {
  console.error(`${api}/v1/rules answered ${res.status}`);
  process.exit(1);
}
const { rules } = await res.json();
writeFileSync("content/rules.json", `${JSON.stringify(rules, null, 2)}\n`);
console.log(`content/rules.json: ${rules.length} rules`);

const patterns = path.join(repo, "docs", "patterns.md");
if (existsSync(patterns)) {
  copyFileSync(patterns, "content/patterns.md");
  console.log(`content/patterns.md: copied from ${patterns}`);
} else {
  console.warn(`skipped content/patterns.md: ${patterns} not found (set RETRYSAFE_REPO)`);
}
