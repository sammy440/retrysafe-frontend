import { NextResponse, type NextRequest } from "next/server";
import rules from "../content/rules.json";

const IDS = new Set((rules as { id: string }[]).map((r) => r.id));

export function proxy(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/")[2];
  if (id && !IDS.has(id)) return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  return NextResponse.next();
}

export const config = { matcher: "/rules/:id" };
