import { NextResponse } from "next/server";
import { aggregateVerdict } from "@/lib/verdict";

export const runtime = "nodejs";
export const maxDuration = 300;

// verdict 不走通用单次 handler：跑 3 次采样投票，返回带稳定度的聚合结果。
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  try {
    const result = await aggregateVerdict(body);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
