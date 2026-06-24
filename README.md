# 溯源 · 新意坐标仪

扔进一个观点（别人的爆款 / 你自己随口说的），它把这观点摆到人类思想地图上——**新不新、源头在哪、旁边哪还空着**。不造爆款、不写标题，只给你背后那个东西。

未来没人看完整内容，大家只问 AI「这讲了个啥」，最后只剩**观点**——观点对碰，唯一让它脱颖而出的是「真的新」。这台仪器就为此而生。

## 五段链

`逼问 → 结构化 → 溯源 → 判定（五选一 + 🌱）→ 前沿罗盘（罗盘为主，军师可选）`

提示词是核心 IP，前四段移植自原型（`reference/原型溯源/`），后两段沿用同样人格与防幻觉纪律新写。详见 `docs/superpowers/specs/`。

## 技术栈

Next.js 16（App Router）+ MiniMax-M3。引擎是六个 thin API 路由，前端编排。M3 是推理模型，`src/lib/minimax.ts` 负责剥离 `<think>` 并兜底解析 JSON。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入 MiniMax 凭据
npm run dev
```

环境变量：

| 变量 | 说明 |
|---|---|
| `MINIMAX_API_KEY` | MiniMax API Key |
| `MINIMAX_BASE_URL` | 默认 `https://api.minimaxi.com/v1` |
| `MINIMAX_MODEL` | 默认 `MiniMax-M3` |

## 防幻觉

假设语气词白名单 · 置信度圆点 0–5 · 宁可留白不编造人名/书名/年份 · 判关系不判人。
