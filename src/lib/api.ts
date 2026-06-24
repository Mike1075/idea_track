// 前端调用层：POST 到 /api/<stage>，成功返回 result，失败抛错。
import type {
  ElicitResult,
  StructuredClaim,
  TraceResult,
  VerdictResult,
  AggregatedVerdict,
  CompassResult,
  ExpandResult,
  FrontierGap,
  LineageNode,
} from "./types";

export const ACCESS_KEY = "siyuan_access_code";

export function getAccessCode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACCESS_KEY) || "";
}
export function setAccessCode(code: string) {
  localStorage.setItem(ACCESS_KEY, code);
}

export class UnauthorizedError extends Error {}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-access-code": getAccessCode() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || data?.code === "UNAUTHORIZED") {
    throw new UnauthorizedError(data?.error || "未授权");
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `「${path}」失败（HTTP ${res.status}）`);
  }
  return data.result as T;
}

// 输入采集
export const apiIngestImage = (images: string[]) =>
  call<{ text: string }>("ingest/image", { images });
export const apiIngestUrl = (url: string) =>
  call<{ text: string; source: string; title?: string }>("ingest/url", { url });

export type ElicitInput = {
  original_input: string;
  round: number;
  history: { question: string; answer: string }[];
  escape_hatch: boolean;
};

export const apiElicit = (input: ElicitInput) =>
  call<ElicitResult>("elicit", input);

export const apiStructure = (refined_claim: string, original_input: string) =>
  call<StructuredClaim>("structure", { refined_claim, original_input, history: [] });

export const apiTrace = (c: StructuredClaim) =>
  call<TraceResult>("trace", {
    proposition: c.proposition,
    assertion: c.assertion,
    argument: c.argument,
    scope: c.scope,
  });

export const apiVerdict = (
  structured_claim: StructuredClaim,
  trace_result: TraceResult
) => call<AggregatedVerdict>("verdict", { structured_claim, trace_result });

export const apiCompass = (
  structured_claim: StructuredClaim,
  trace_result: TraceResult,
  verdict_result: VerdictResult
) =>
  call<CompassResult>("compass", {
    structured_claim,
    trace_result,
    verdict_result,
  });

export const apiExpand = (
  original_claim: StructuredClaim,
  selected_frontier: FrontierGap,
  lineage: LineageNode[]
) => call<ExpandResult>("expand", { original_claim, selected_frontier, lineage });
