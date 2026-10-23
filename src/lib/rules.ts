import rules from "../../content/rules.json";

export interface RuleDoc {
  id: string;
  severity: "error" | "warning" | "info";
  summary: string;
  why: string;
  safePattern: string;
}

export const RULES = rules as RuleDoc[];

export function getRule(id: string): RuleDoc | undefined {
  return RULES.find((r) => r.id === id);
}

export const RULE_EXAMPLES: Record<string, string> = {
  "unguarded-side-effect": "stripe-unguarded",
  "record-before-effect-no-tx": "record-first",
  "check-then-insert-race": "lookup-race",
  "effect-before-record": "lookup-race",
  "queue-add-without-job-id": "queue-worker",
  "effect-missing-idempotency-key": "queue-worker",
  "dedupe-ttl-short": "record-first",
  "incrementing-write-unguarded": "record-first",
};
