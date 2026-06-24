import { NextResponse } from "next/server";
import { askVisionText } from "@/lib/minimax";

export const runtime = "nodejs";
export const maxDuration = 120;

const INSTRUCTION =
  "这些图片是某个内容（视频截图/文章/聊天/海报等）。请把图片里表达的【核心观点文字】原样转写并按顺序拼接出来，保留作者的措辞，不要总结、不要加你自己的解读、不要描述画面。只输出转写出的文字本身。";

export async function POST(req: Request) {
  let body: { images?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const images = (body.images || []).filter((s) => typeof s === "string" && s.startsWith("data:"));
  if (!images.length)
    return NextResponse.json({ ok: false, error: "没有有效图片（需 data URL）" }, { status: 400 });
  if (images.length > 6)
    return NextResponse.json({ ok: false, error: "一次最多 6 张" }, { status: 400 });
  try {
    const text = await askVisionText(images, INSTRUCTION);
    return NextResponse.json({ ok: true, result: { text } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
