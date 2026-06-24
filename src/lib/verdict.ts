// 判定多次采样投票：跑 N 次 verdict（升温让它真分歧），用分歧本身当信号。
// 全不长新枝 → 复述区；全长 → 新枝区；分裂 → 边界区（两种读法都成立，诚实呈现）。
import { askJson } from "./minimax";
import { PROMPTS } from "./prompts";
import type { VerdictResult, AggregatedVerdict, VerdictBand } from "./types";

const N = 3;
const SAMPLE_TEMP = 0.7; // 比默认 0.2 高，让样本真分歧、暴露边界

const CAT_NAME = ["", "复述/换皮", "应用/举例", "精化", "综合", "新分支/反驳"];

function bandReason(band: VerdictBand, sprout: number, total: number): string {
  if (band === "复述区")
    return `${total} 次判定都没长出新枝——这一笔主要在旧体系里打转。`;
  if (band === "新枝区")
    return `${total} 次判定都长出了新枝——稳定地越出了旧体系。`;
  return `${total} 次里 ${sprout} 次判它长新枝、${total - sprout} 次判没有——它正卡在"复述"与"新枝"的边界上，两种读法都站得住。这种"边界感"本身就是这一笔最该被看到的地方。`;
}

export async function aggregateVerdict(input: unknown): Promise<AggregatedVerdict> {
  const settled = await Promise.allSettled(
    Array.from({ length: N }, () =>
      askJson<VerdictResult>(PROMPTS.verdict, input, { temperature: SAMPLE_TEMP })
    )
  );
  const valid = settled
    .filter((s): s is PromiseFulfilledResult<VerdictResult> => s.status === "fulfilled")
    .map((s) => s.value)
    .filter((v) => v && typeof v.category_id === "number");

  if (valid.length === 0) throw new Error("判定全部采样失败");

  const total = valid.length;
  const sproutVotes = valid.filter((v) => v.sprouted).length;

  // 类别众数
  const counts = new Map<number, number>();
  for (const v of valid) counts.set(v.category_id, (counts.get(v.category_id) ?? 0) + 1);
  let modeCat = valid[0].category_id;
  let modeN = 0;
  for (const [cat, n] of counts) if (n > modeN) ((modeN = n), (modeCat = cat));
  const representative = valid.find((v) => v.category_id === modeCat) ?? valid[0];

  let band: VerdictBand;
  if (sproutVotes === 0) band = "复述区";
  else if (sproutVotes === total) band = "新枝区";
  else band = "边界区";

  const sprouted = sproutVotes * 2 > total;

  const dist = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n}票·${CAT_NAME[c] ?? c}`)
    .join("、");
  const stability = `${total} 次采样：${dist}`;

  return {
    verdict: representative,
    band,
    band_reason: bandReason(band, sproutVotes, total),
    sprouted,
    sprout_votes: sproutVotes,
    total,
    stability,
    samples: valid.map((v) => ({
      category_id: v.category_id,
      category_name: v.category_name,
      sprouted: v.sprouted,
    })),
  };
}
