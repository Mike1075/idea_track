import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 外层还存在 /Users/mike/package-lock.json，显式锁定工作区根目录，
  // 避免 Next 推断错误（也影响 Vercel 构建）。
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
