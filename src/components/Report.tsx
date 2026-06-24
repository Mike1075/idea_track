"use client";

import { useState } from "react";
import type {
  StructuredClaim,
  TraceResult,
  VerdictResult,
  CompassResult,
  FrontierGap,
  ExpandResult,
  LineageNode,
} from "@/lib/types";
import { apiExpand } from "@/lib/api";

function Dots({ n, tone = "muted" }: { n: number; tone?: "muted" | "accent" | "gold" }) {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  const color =
    tone === "accent" ? "var(--accent)" : tone === "gold" ? "var(--gold)" : "var(--muted)";
  return (
    <span className="dot text-[11px]" style={{ color }} title={`置信度 ${v}/5`}>
      {"●".repeat(v)}
      <span style={{ color: "var(--faint)" }}>{"○".repeat(5 - v)}</span>
    </span>
  );
}

function SectionTitle({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-[11px] tracking-[0.3em] text-[var(--faint)] uppercase">{k}</span>
      <h2 className="text-sm tracking-wide text-[var(--muted)]">{children}</h2>
    </div>
  );
}

/* ── 结构化主张 ── */
function ClaimCard({ c }: { c: StructuredClaim }) {
  const rows: [string, string][] = [
    ["主张", c.proposition],
    ["断言（对立面）", c.assertion],
    ["论证", c.argument],
    ["适用范围", c.scope],
  ];
  return (
    <div className="rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <SectionTitle k="claim">结构化主张</SectionTitle>
      <div className="space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[88px_1fr] gap-3">
            <div className="text-xs text-[var(--faint)] pt-0.5">{k}</div>
            <div className={k === "主张" ? "serif text-[var(--foreground)] text-[15px] leading-relaxed" : "text-sm text-[var(--foreground)]/90 leading-relaxed"}>
              {v}
            </div>
          </div>
        ))}
        <div className="pt-1 text-[11px] text-[var(--faint)]">
          论证完整度：{c.argument_completeness} · {c.falsifiable_check?.verdict}
        </div>
      </div>
    </div>
  );
}

/* ── 血缘脊线 ── */
function relationColor(r: string) {
  if (r.includes("反驳") || r.includes("新分支")) return "var(--accent)";
  if (r.includes("综合")) return "var(--accent)";
  if (r.includes("精化")) return "var(--gold)";
  return "var(--faint)";
}

function LineageSpine({ t }: { t: TraceResult }) {
  return (
    <div className="rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <SectionTitle k="trace">溯源 · 血缘脊线</SectionTitle>
      <div className="serif text-[15px] text-[var(--foreground)] mb-1">「{t.your_statement}」</div>
      <div className="text-[11px] text-[var(--faint)] mb-4">你的说法 · 越往下越古老（血缘为假设，非定论）</div>

      <div className="relative pl-6">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--line)]" />
        {t.lineage?.map((n: LineageNode, i) => {
          const faint = n.level === "insufficient" || n.dashed || n.confidence === 0;
          return (
            <div key={i} className="relative pb-5 last:pb-0">
              <span
                className="absolute -left-[22px] top-1 w-[13px] h-[13px] rounded-full border-2"
                style={{
                  borderColor: faint ? "var(--faint)" : relationColor(n.relation_hint),
                  background: faint ? "transparent" : "var(--panel)",
                  borderStyle: faint ? "dashed" : "solid",
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--panel-2)", color: relationColor(n.relation_hint) }}
                >
                  {n.relation_hint}
                </span>
                <span className="text-[11px] text-[var(--faint)]">{n.role}{n.year ? ` · ${n.year}` : ""}</span>
                <Dots n={n.confidence} tone={n.level === "tradition" ? "gold" : "muted"} />
              </div>
              <div className={`serif mt-1 ${faint ? "text-[var(--faint)] italic" : "text-[var(--foreground)]"} text-[15px]`}>
                {n.content}
              </div>
              {n.said && <div className="text-sm text-[var(--foreground)]/75 mt-0.5 leading-relaxed">{n.said}</div>}
              <div className="text-[11px] text-[var(--faint)] mt-1">
                {n.hedge} · {n.reasoning}
              </div>
            </div>
          );
        })}
      </div>

      {t.multi_source?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[var(--line)]">
          <div className="text-[11px] text-[var(--faint)] mb-2">横向众源 · 多人独立想到，撞车 ≠ 抄袭</div>
          <div className="flex flex-wrap gap-2">
            {t.multi_source.map((m, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-[var(--line)] text-[var(--muted)]">
                {m.camp}：{m.their_name_for_it} <Dots n={m.confidence} />
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 text-[11px] text-[var(--faint)] italic">{t.disclaimer}</div>
    </div>
  );
}

/* ── 判定印章 ── */
function VerdictStamp({ v }: { v: VerdictResult }) {
  return (
    <div
      className="rise rounded-xl border p-5"
      style={{
        borderColor: v.sprouted ? "var(--accent-dim)" : "var(--line)",
        background: v.sprouted
          ? "linear-gradient(180deg, rgba(127,182,133,0.08), var(--panel))"
          : "var(--panel)",
      }}
    >
      <SectionTitle k="verdict">判定 · 判关系不判人</SectionTitle>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-xs px-2 py-1 rounded border border-[var(--line)] text-[var(--muted)]">
          {v.category_id} · {v.category_name}
        </span>
        {v.sprouted && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
            🌱 长出了新枝芽
          </span>
        )}
      </div>
      <div className="serif text-lg text-[var(--foreground)] leading-relaxed">「{v.stamp_phrase}」</div>
      <div className="text-sm text-[var(--foreground)]/85 mt-2 leading-relaxed">{v.verdict_statement}</div>
      <div className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{v.reason}</div>
      {v.sprouted && v.sprout_reason && (
        <div className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--accent)" }}>
          新在哪：{v.sprout_reason}
        </div>
      )}
    </div>
  );
}

/* ── 前沿罗盘 + 军师 ── */
function FrontierCard({
  gap,
  claim,
  lineage,
}: {
  gap: FrontierGap;
  claim: StructuredClaim;
  lineage: LineageNode[];
}) {
  const [exp, setExp] = useState<ExpandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function expand() {
    setLoading(true);
    setErr("");
    try {
      setExp(await apiExpand(claim, gap, lineage));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--gold)" }}>
          {gap.type}
        </span>
        <Dots n={gap.confidence} tone="accent" />
      </div>
      <div className="serif text-[15px] text-[var(--foreground)] leading-relaxed">{gap.title}</div>
      <div className="text-sm text-[var(--foreground)]/80 mt-1.5 leading-relaxed">{gap.direction}</div>
      <div className="text-[11px] text-[var(--faint)] mt-2">
        {gap.hedge} · {gap.occupied_hint}
      </div>

      {gap.expandable && !exp && (
        <button
          onClick={expand}
          disabled={loading}
          className="mt-3 text-xs px-3 py-1.5 rounded-md border border-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent-dim)]/30 transition disabled:opacity-50"
        >
          {loading ? "军师思考中…" : "让军师展开 →"}
        </button>
      )}
      {err && <div className="mt-2 text-xs text-[var(--danger)]">{err}</div>}

      {exp && (
        <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
          <div className="text-[11px] text-[var(--faint)]">军师草稿（生成，非定论，待你再打磨）：</div>
          {exp.candidates.map((c, i) => (
            <div key={i} className="rounded-md bg-[var(--panel)] border border-[var(--line)] p-3">
              <div className="serif text-[15px] text-[var(--foreground)] leading-relaxed">{c.statement}</div>
              <div className="text-[11px] text-[var(--muted)] mt-1.5 space-y-0.5">
                <div>谁拍桌反对：{c.opponent}</div>
                <div>边界：{c.boundary}</div>
                <div style={{ color: "var(--accent)" }}>新在哪：{c.why_new}</div>
              </div>
            </div>
          ))}
          <div className="text-[11px] text-[var(--faint)] italic">{exp.caveat}</div>
        </div>
      )}
    </div>
  );
}

function Compass({
  c,
  claim,
  lineage,
}: {
  c: CompassResult;
  claim: StructuredClaim;
  lineage: LineageNode[];
}) {
  return (
    <div className="rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <SectionTitle k="compass">前沿罗盘 · 旁边哪还空着</SectionTitle>
      <div className="serif text-[15px] text-[var(--foreground)] leading-relaxed">{c.coordinate_summary}</div>
      <div className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">{c.standout_read}</div>
      <div className="grid gap-3 mt-4 sm:grid-cols-2">
        {c.frontier?.map((g, i) => (
          <FrontierCard key={i} gap={g} claim={claim} lineage={lineage} />
        ))}
      </div>
      <div className="mt-4 text-[11px] text-[var(--faint)] italic">{c.honesty_note}</div>
    </div>
  );
}

export type FullReport = {
  claim: StructuredClaim;
  trace: TraceResult;
  verdict: VerdictResult;
  compass: CompassResult;
};

export default function Report({ r }: { r: FullReport }) {
  return (
    <div className="space-y-4">
      <VerdictStamp v={r.verdict} />
      <Compass c={r.compass} claim={r.claim} lineage={r.trace.lineage} />
      <LineageSpine t={r.trace} />
      <ClaimCard c={r.claim} />
    </div>
  );
}
