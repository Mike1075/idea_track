import type { FullReport } from "@/components/Report";

function dots(n: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n || 0)));
  return "●".repeat(v) + "○".repeat(5 - v);
}

// 把一份报告序列化成可分享的 Markdown
export function reportToMarkdown(r: FullReport): string {
  const { claim, trace, compass } = r;
  const a = r.verdict;
  const v = a.verdict;
  const L: string[] = [];

  L.push(`# 溯源 · 新意坐标仪报告`);
  if (r.original) L.push(`\n> 原始观点：${r.original.trim()}`);

  L.push(`\n## 判定 · ${a.band}`);
  L.push(`- 代表判定：${v.category_id}·${v.category_name}`);
  L.push(`- 稳定度：${a.stability}`);
  L.push(`- ${a.band_reason}`);
  L.push(`- 印章：「${v.stamp_phrase}」`);
  if (v.verdict_statement) L.push(`- ${v.verdict_statement}`);
  if (a.band === "新枝区" && v.sprout_reason) L.push(`- 新在哪：${v.sprout_reason}`);

  L.push(`\n## 前沿罗盘`);
  if (compass?.coordinate_summary) L.push(compass.coordinate_summary);
  if (compass?.standout_read) L.push(`\n${compass.standout_read}`);
  for (const g of compass?.frontier ?? []) {
    L.push(`\n### [${g.type}] ${g.title}  ${dots(g.confidence)}`);
    L.push(g.direction);
    L.push(`_${g.hedge} · ${g.occupied_hint}_`);
  }
  if (compass?.honesty_note) L.push(`\n_${compass.honesty_note}_`);

  L.push(`\n## 溯源 · 血缘脊线`);
  L.push(`「${trace?.your_statement}」`);
  for (const n of trace?.lineage ?? []) {
    L.push(`\n- **[${n.relation_hint}] ${n.content}**${n.year ? ` (${n.year})` : ""} ${dots(n.confidence)}`);
    if (n.said) L.push(`  - ${n.said}`);
    L.push(`  - _${n.hedge} · ${n.reasoning}_`);
  }
  if (trace?.multi_source?.length) {
    L.push(`\n**横向众源：**`);
    for (const m of trace.multi_source) L.push(`- ${m.camp}：${m.their_name_for_it} ${dots(m.confidence)}`);
  }
  if (trace?.disclaimer) L.push(`\n_${trace.disclaimer}_`);

  L.push(`\n## 结构化主张`);
  L.push(`- **主张**：${claim?.proposition}`);
  L.push(`- **断言（对立面）**：${claim?.assertion}`);
  L.push(`- **论证**：${claim?.argument}`);
  L.push(`- **适用范围**：${claim?.scope}`);
  L.push(`- 论证完整度：${claim?.argument_completeness} · ${claim?.falsifiable_check?.verdict}`);

  L.push(`\n---\n_血缘与前沿均为假设，非定论；置信度 ●●●○○ 仅供参考。引擎：MiniMax-M3，判定为 3 次采样投票。_`);
  return L.join("\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = filename;
  document.body.appendChild(aEl);
  aEl.click();
  aEl.remove();
  URL.revokeObjectURL(url);
}
