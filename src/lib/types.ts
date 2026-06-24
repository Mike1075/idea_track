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
