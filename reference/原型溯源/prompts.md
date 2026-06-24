# 溯源 · 四段提示词链

这是产品的核心 IP。四段提示词按顺序串接，每段都要求模型输出**严格 JSON**，前端解析后渲染。
可独立拿去任何支持 system+user 消息的模型（GPT / Claude / MiniMax 均可）。建议 `temperature 0~0.3` 压低编造。

## 数据流（字段已对齐，可直接串接）

```
用户原话
  └─① elicit ──> refined_claim
        └─② structure ──> { proposition, assertion, argument, scope }
              ├─③ trace ──> { your_statement, lineage[], multi_source[], disclaimer }
              └─④ verdict(②+③) ──> { category_id, verdict_statement, sprouted, stamp_phrase, ... }
```

## 防幻觉三重设防（重心在 ③ trace）

1. **假设语气词白名单**：只能用「可能来自 / 线索指向 / 一种血缘假设 / 推测经由 / 这一脉或可追溯到」；**禁用**「出自 / 引自 / 你抄了 / 这其实是」。
2. **置信度圆点 0–5**（前端渲染 ●●●○○，不用百分比，避免伪精确）：纯猜测必须为 0，并强制转成 `level:"insufficient"` 的**留白节点**（宁可留白也不编造人名/书名/年份）。
3. **判关系不判人 + score 不外显**：判定是五选一关系分类，不是认知等级量表打分；内部 `score` 前端忽略，只渲染标签 + 🌱。

---

## ① elicit（逼问 · 抬杠的同谋）
输入：`{ original_input, round, history, escape_hatch }`
输出：`{ needs_followup, diagnosis, question, opponents[], refined_claim, still_soft, guessed_claims[] }`
作用：最多 2 轮苏格拉底追问，把模糊感受逼成「有对立面 + 有边界」的可证伪主张。

## ② structure（结构化 · 谦卑的镜子）
输入：`{ refined_claim, history, original_input }`
输出：`{ proposition, assertion, argument, argument_completeness, scope, falsifiable_check }`
作用：抽成四字段。论证不足时如实标 `weak/missing`，不补造证据。

## ③ trace（溯源+众源 · 谦卑的镜子）
输入：`{ proposition, assertion, argument, scope }`
输出：`{ your_statement, lineage[], multi_source[], disclaimer }`
作用：纵向多层血缘假设 + 横向多阵营众源，每条带置信度与假设语气词，无把握处留白。

## ④ verdict（判定 · 谦卑的镜子）
输入：`{ structured_claim, trace_result }`
输出：`{ category_id(1-5), category_name, verdict_statement, reason, score, sprouted, sprout_reason, stamp_phrase, rebuttal_prompt }`
作用：五选一关系分类。只有 4(综合)、5(新分支/反驳)、及很强的 3(精化)触发「🌱 新枝芽」。

> 完整提示词正文以 `溯源.html` 内 `PROMPTS` 常量为准（已原样内嵌、未改写语义）。
