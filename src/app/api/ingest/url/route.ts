import { NextResponse } from "next/server";
import { ingestUrl } from "@/lib/fetchers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ ok: false, error: "缺少 url" }, { status: 400 });
  try {
    const result = await ingestUrl(body.url);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
