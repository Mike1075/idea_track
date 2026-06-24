import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 访问口令闸门：保护所有 /api 端点不被陌生人刷爆 MiniMax/网关额度。
// 前端从 localStorage 取口令，作为 x-access-code 头发送。
// 未设 APP_ACCESS_CODE 时放行（本地开发方便）。
export function proxy(req: NextRequest) {
  const code = process.env.APP_ACCESS_CODE;
  if (!code) return NextResponse.next();
  if (req.headers.get("x-access-code") === code) return NextResponse.next();
  return NextResponse.json(
    { ok: false, error: "未授权：请输入访问口令", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export const config = { matcher: "/api/:path*" };
