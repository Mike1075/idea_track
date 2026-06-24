// MiniMax M3 调用层。M3 是推理模型，正文里会内嵌 <think>...</think>，
// 我们要的是严格 JSON，所以解析前必须剥掉思考段，并兜底重试。

const BASE = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M3";
const KEY = process.env.MINIMAX_API_KEY || "";

type Msg = { role: "system" | "user" | "assistant"; content: string };

class JsonParseError extends Error {}

/** 剥掉 M3 的 <think> 段、markdown 代码围栏，取出最外层 JSON 对象。 */
function extractJson(raw: string): string {
  let s = raw ?? "";
  // 1) 去掉思考段：保留最后一个 </think> 之后的内容
  const lastThinkEnd = s.lastIndexOf("</think>");
  if (lastThinkEnd !== -1) {
    s = s.slice(lastThinkEnd + "</think>".length);
  } else if (s.includes("<think>")) {
    // 有 <think> 但没闭合 —— 说明被 max_tokens 截断了，交给上层重试
    throw new JsonParseError("响应在思考段被截断（缺少 </think>），可能 max_tokens 不足");
  }
  // 2) 去掉 ```json ... ``` 围栏
  s = s.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  // 3) 截取第一个 { 到最后一个 } 之间的内容
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new JsonParseError("响应中找不到 JSON 对象");
  }
  return s.slice(first, last + 1);
}

async function rawCall(messages: Msg[], maxTokens: number, temperature: number): Promise<string> {
  if (!KEY) throw new Error("缺少 MINIMAX_API_KEY 环境变量");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MiniMax HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  const code = data?.base_resp?.status_code;
  if (code && code !== 0) {
    throw new Error(`MiniMax 业务错误 ${code}: ${data?.base_resp?.status_msg}`);
  }
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("MiniMax 返回空内容");
  return content;
}

/**
 * 用一段 system prompt + 一个输入对象，要 M3 输出严格 JSON 并解析成 T。
 * 失败自动重试一次（提高 token 上限 + 追加“只输出 JSON”提示）。
 */
export async function askJson<T = unknown>(
  systemPrompt: string,
  input: unknown,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<T> {
  const temperature = opts.temperature ?? 0.2;
  const userContent =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const baseMessages: Msg[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const attempts: { messages: Msg[]; maxTokens: number }[] = [
    { messages: baseMessages, maxTokens: opts.maxTokens ?? 8000 },
    {
      messages: [
        ...baseMessages,
        {
          role: "user",
          content:
            "上一次没有给出可解析的 JSON。请只输出那个 JSON 对象本身，不要任何思考过程之外的解释、不要 markdown 围栏。",
        },
      ],
      maxTokens: (opts.maxTokens ?? 8000) + 4000,
    },
  ];

  let lastErr: unknown;
  for (const a of attempts) {
    try {
      const raw = await rawCall(a.messages, a.maxTokens, temperature);
      const json = extractJson(raw);
      return JSON.parse(json) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `MiniMax JSON 解析失败：${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

function stripThink(s: string): string {
  const e = (s ?? "").lastIndexOf("</think>");
  return e !== -1 ? s.slice(e + "</think>".length).trim() : (s ?? "").trim();
}

type VisionPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** M3 是多模态模型：传 data URL 图片 + 指令，返回纯文本（已剥离 <think>）。 */
export async function askVisionText(
  images: string[],
  instruction: string,
  opts: { maxTokens?: number } = {}
): Promise<string> {
  if (!KEY) throw new Error("缺少 MINIMAX_API_KEY 环境变量");
  if (!images.length) throw new Error("没有图片");
  const content: VisionPart[] = [
    { type: "text", text: instruction },
    ...images.map((url) => ({ type: "image_url", image_url: { url } }) as VisionPart),
  ];
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
      max_tokens: opts.maxTokens ?? 3000,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error(`MiniMax 视觉 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0)
    throw new Error(`MiniMax 视觉错误 ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
  const c = data?.choices?.[0]?.message?.content ?? "";
  if (!c) throw new Error("MiniMax 视觉返回空内容");
  return stripThink(c);
}
