// 五段链每一步的输出类型。字段与 prompts.ts 中各段 JSON 约定对齐。

export type ElicitResult = {
  needs_followup: boolean;
  round: number;
  diagnosis: string;
  question: string;
  opponents: string[];
  refined_claim: string;
  still_soft: string;
  guessed_claims: string[];
};

export type StructuredClaim = {
  proposition: string;
  assertion: string;
  argument: string;
  argument_completeness: "strong" | "weak" | "missing";
  scope: string;
  falsifiable_check: {
    has_opponent: boolean;
    has_boundary: boolean;
    verdict: string;
  };
};

export type LineageNode = {
  level: "popularizer" | "framework" | "tradition" | "insufficient";
  role: string;
  content: string;
  year: string;
  hedge: string;
  confidence: number;
  dashed: boolean;
  relation_hint: string;
  said: string;
  reasoning: string;
};

export type MultiSource = {
  camp: string;
  their_name_for_it: string;
  hedge: string;
  confidence: number;
};

export type TraceResult = {
  your_statement: string;
  lineage: LineageNode[];
  multi_source: MultiSource[];
  disclaimer: string;
};

export type VerdictResult = {
  category_id: number;
  category_name: string;
  verdict_statement: string;
  reason: string;
  score: number;
  sprouted: boolean;
  sprout_reason: string;
  stamp_phrase: string;
  rebuttal_prompt: string;
};

export type VerdictBand = "复述区" | "边界区" | "新枝区";

// verdict 多次采样投票后的聚合结果
export type AggregatedVerdict = {
  verdict: VerdictResult; // 代表样本（众数类别里的一条）
  band: VerdictBand;
  band_reason: string;
  sprouted: boolean; // 多数票是否长新枝
  sprout_votes: number;
  total: number;
  stability: string; // 人话稳定度，如「3 次采样：2票·综合、1票·应用」
  samples: { category_id: number; category_name: string; sprouted: boolean }[];
};

export type FrontierGap = {
  type: string;
  title: string;
  direction: string;
  hedge: string;
  confidence: number;
  occupied_hint: string;
  expandable: boolean;
};

export type CompassResult = {
  coordinate_summary: string;
  standout_read: string;
  frontier: FrontierGap[];
  honesty_note: string;
};

export type ExpandCandidate = {
  statement: string;
  opponent: string;
  boundary: string;
  why_new: string;
  note: string;
};

export type ExpandResult = {
  candidates: ExpandCandidate[];
  caveat: string;
};
