export const API_URL = (process.env.NEXT_PUBLIC_RETRYSAFE_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export type Severity = "error" | "warning" | "info";
export type Confidence = "high" | "medium" | "low";

export interface Guard {
  kind: string;
  atomic: boolean | "unknown";
  description: string;
  location: SourceLocation;
  order: number;
  schema?: "unique-constraint" | "no-unique-constraint" | "not-found";
  schemaSource?: string;
}

export interface Effect {
  kind: string;
  callee: string;
  module: string;
  idempotent: boolean | "unknown";
  note?: string;
  location: SourceLocation;
  path: SourceLocation[];
  hasIdempotencyKey: boolean;
  acceptsIdempotencyKey?: { arg: number; field: string };
  protectedBy: Guard[];
  order: number;
}

export interface Check {
  kind: string;
  callee: string;
  location: SourceLocation;
  order: number;
}

export interface Finding {
  id: string;
  rule: string;
  severity: Severity;
  confidence: Confidence;
  handler: string;
  location: SourceLocation;
  message: string;
  effect?: Effect;
  failingSequence: string[];
  fix: string;
  snippet?: string;
  excerpt?: { startLine: number; lines: string[] };
}

export interface HandlerReport {
  handler: { id: string; kind: string; framework: string; name: string; location: SourceLocation; provider?: string; signals: string[] };
  effects: Effect[];
  guards: Guard[];
  checks: Check[];
  records: { kind: string; description: string; location: SourceLocation; order: number }[];
  findings: Finding[];
}

export interface AnalysisResult {
  candidates: number;
  handlers: HandlerReport[];
  findings: Finding[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: { path: string; message: string }[];
}

export class AnalyzeError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
  }
}

export async function analyze(files: Record<string, string>, options: { minConfidence?: Confidence } = {}, signal?: AbortSignal): Promise<{ result: AnalysisResult; durationMs: number }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files, options }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new AnalyzeError(0, { code: "unreachable", message: `Could not reach the analysis API at ${API_URL}.` });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new AnalyzeError(res.status, (body as { error?: ApiError }).error ?? { code: "http_error", message: `The API answered ${res.status}.` });
  return body as { result: AnalysisResult; durationMs: number };
}
