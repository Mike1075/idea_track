"use client";

import { useState } from "react";
import {
  apiElicit,
  apiStructure,
  apiTrace,
  apiVerdict,
  apiCompass,
} from "@/lib/api";
import type { ElicitResult } from "@/lib/types";
import Report, { type FullReport } from "@/components/Report";

type Mode = "others" | "mine";
type Phase = "idle" | "eliciting" | "analyzing" | "report" | "error";

const STEPS = ["结构化", "溯源", "判定", "前沿罗盘"] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("others");
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  // elicit 状态
  const [original, setOriginal] = useState("");
  const [elicit, setElicit] = useState<ElicitResult | null>(null);
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [answer, setAnswer] = useState("");
  const [round, setRound] = useState(1);

  // 分析状态
  const [stepIdx, setStepIdx] = useState(0);
  const [report, setReport] = useState<FullReport | null>(null);

  function reset() {
    setPhase("idle");
    setInput("");
    setOriginal("");
    setElicit(null);
    setHistory([]);
    setAnswer("");
    setRound(1);
    setStepIdx(0);
    setReport(null);
    setError("");
  }

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : String(e));
    setPhase("error");
  }

  // ── 跑后四段：结构化 → 溯源 → 判定 → 前沿罗盘 ──
  async function runAnalyze(refinedClaim: string, originalInput: string) {
    setPhase("analyzing");
    setStepIdx(0);
    try {
      const claim = await apiStructure(refinedClaim, originalInput);
      setStepIdx(1);
      const trace = await apiTrace(claim);
      setStepIdx(2);
      const verdict = await apiVerdict(claim, trace);
      setStepIdx(3);
      const compass = await apiCompass(claim, trace, verdict);
      setReport({ claim, trace, verdict, compass });
      setPhase("report");
    } catch (e) {
      fail(e);
    }
  }

  // ── 逼问：开始 / 继续 ──
  async function startElicit(escape = false) {
    const text = input.trim();
    if (!text) return;
    setOriginal(text);
    setPhase("eliciting");
    setElicit(null);
    try {
      const r = await apiElicit({
        original_input: text,
        round: 1,
        history: [],
        escape_hatch: escape,
      });
      handleElicit(r, text);
    } catch (e) {
      fail(e);
    }
  }

  async function submitAnswer(escape = false) {
    if (!elicit) return;
    const a = answer.trim();
    if (!a && !escape) return;
    const newHist = [...history, { question: elicit.question, answer: a }];
    setHistory(newHist);
    setAnswer("");
    const nextRound = round + 1;
    setRound(nextRound);
    setElicit(null);
    try {
      const r = await apiElicit({
        original_input: original,
        round: nextRound,
        history: newHist,
        escape_hatch: escape,
      });
      handleElicit(r, original);
    } catch (e) {
      fail(e);
    }
  }

  function handleElicit(r: ElicitResult, originalInput: string) {
    if (!r.needs_followup && r.refined_claim) {
      runAnalyze(r.refined_claim, originalInput);
      return;
    }
    setElicit(r);
    setPhase("eliciting");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="serif text-2xl text-[var(--foreground)]">溯源 · 新意坐标仪</h1>
        <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
          扔进一个观点——它把这观点摆到人类思想地图上：新不新、源头在哪、旁边哪还空着。
          <br />
          不造爆款、不写标题，只给你背后那个东西。
        </p>
      </header>

      {/* 输入 */}
      {phase === "idle" && (
        <div className="rise space-y-4">
          <div className="inline-flex rounded-lg border border-[var(--line)] p-0.5 text-xs">
            {(
              [
                ["others", "拆别人的爆款"],
                ["mine", "检验我自己的观点"],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md transition ${
                  mode === m
                    ? "bg-[var(--panel-2)] text-[var(--foreground)]"
                    : "text-[var(--faint)] hover:text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder={
              mode === "others"
                ? "粘一个观点 / 一句爆款里的核心说法，比如：情绪稳定是成年人最高级的能力"
                : "说一个你自己的观点，哪怕只是个念头——看看它到底新不新"
            }
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-[15px] leading-relaxed serif text-[var(--foreground)] placeholder:text-[var(--faint)] placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-[var(--accent-dim)] resize-none"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => startElicit(false)}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] text-sm hover:brightness-125 transition disabled:opacity-40"
            >
              逼问打磨 → 再溯源
            </button>
            <button
              onClick={() => runAnalyze(input.trim(), input.trim())}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] hover:border-[var(--accent-dim)] transition disabled:opacity-40"
            >
              直接溯源（跳过逼问）
            </button>
          </div>
          <p className="text-[11px] text-[var(--faint)]">
            「逼问」会用最多 2 轮苏格拉底追问，把模糊感受逼成有对立面、有边界的可证伪主张，再溯源。
          </p>
        </div>
      )}

      {/* 逼问 */}
      {phase === "eliciting" && (
        <div className="rise space-y-4">
          <div className="text-[11px] tracking-[0.3em] text-[var(--faint)] uppercase">
            elicit · 第 {round} 轮 / 最多 2 轮
          </div>
          {!elicit ? (
            <Thinking label="抬杠的同谋正在想怎么戳你…" />
          ) : (
            <>
              <div className="serif text-lg text-[var(--foreground)] leading-relaxed">
                {elicit.question || "再逼自己一句。"}
              </div>
              {elicit.opponents?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {elicit.opponents.map((o, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full border border-[var(--line)] text-[var(--muted)]"
                    >
                      反方：{o}
                    </span>
                  ))}
                </div>
              )}
              {elicit.guessed_claims?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--faint)]">帮你猜的候选（点一个直接分析）：</div>
                  {elicit.guessed_claims.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => runAnalyze(g, original)}
                      className="block w-full text-left serif text-sm rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 hover:border-[var(--accent-dim)] transition"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                placeholder="回答它的追问，把观点逼得更利一点…"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-[15px] serif text-[var(--foreground)] placeholder:font-sans placeholder:text-sm placeholder:text-[var(--faint)] focus:outline-none focus:border-[var(--accent-dim)] resize-none"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => submitAnswer(false)}
                  disabled={!answer.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] text-sm hover:brightness-125 transition disabled:opacity-40"
                >
                  提交，再逼一轮
                </button>
                <button
                  onClick={() => runAnalyze(answer.trim() || original, original)}
                  className="px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition"
                >
                  够了，直接溯源
                </button>
                <button
                  onClick={() => submitAnswer(true)}
                  className="px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--faint)] text-sm hover:text-[var(--muted)] transition"
                >
                  我说不清，帮我猜
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 分析进度 */}
      {phase === "analyzing" && (
        <div className="rise space-y-4">
          <div className="text-[11px] tracking-[0.3em] text-[var(--faint)] uppercase">analyzing</div>
          <div className="space-y-2.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px]"
                  style={{
                    borderColor:
                      i < stepIdx ? "var(--accent)" : i === stepIdx ? "var(--gold)" : "var(--line)",
                    color: i < stepIdx ? "var(--accent)" : "var(--faint)",
                  }}
                >
                  {i < stepIdx ? "✓" : ""}
                </span>
                <span
                  className={`text-sm ${
                    i === stepIdx
                      ? "text-[var(--foreground)]"
                      : i < stepIdx
                        ? "text-[var(--muted)]"
                        : "text-[var(--faint)]"
                  }`}
                >
                  {s}
                  {i === stepIdx && <span className="ml-2 text-[var(--gold)] animate-pulse">…</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--faint)]">
            M3 是推理模型，每步会先思考再下判断，请稍候。
          </p>
        </div>
      )}

      {/* 报告 */}
      {phase === "report" && report && (
        <div className="rise">
          <Report r={report} />
          <button
            onClick={reset}
            className="mt-6 px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition"
          >
            ← 换一个观点
          </button>
        </div>
      )}

      {/* 错误 */}
      {phase === "error" && (
        <div className="rise space-y-4">
          <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--panel)] p-5">
            <div className="text-sm text-[var(--danger)]">出错了</div>
            <div className="text-[13px] text-[var(--muted)] mt-1.5 break-words">{error}</div>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition"
          >
            ← 重来
          </button>
        </div>
      )}

      <footer className="mt-16 pt-6 border-t border-[var(--line)] text-[11px] text-[var(--faint)] leading-relaxed">
        血缘与前沿均为「假设」，非定论；置信度圆点 ●●●○○ 仅供参考。引擎继承防幻觉三重设防：宁可留白，不编造人名/书名/年份。
        <br />
        模型：MiniMax-M3。
      </footer>
    </main>
  );
}

function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <span className="animate-pulse text-[var(--gold)]">●</span>
      {label}
    </div>
  );
}
