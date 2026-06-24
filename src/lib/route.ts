import { NextResponse } from "next/server";
import { askJson } from "./minimax";

// 把「读 body → 调 M3 → 返回 JSON / 错误」打成一个工厂，六个路由共用。
export function makeStageHandler(systemPrompt: string) {
  return async function POST(req: Request) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
    }
    try {
      const result = await askJson(systemPrompt, body);
      return NextResponse.json({ ok: true, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
  };
}
