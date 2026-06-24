// URL 抓取：YouTube 字幕 / 公众号正文 / 通用网页正文 → 纯文本，供五段链消费。
// 注意：云端机房 IP 偶被各平台限制；失败时给清晰报错，让用户改用手动粘贴。

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export type IngestResult = { text: string; source: string; title?: string };

async function get(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8", ...extraHeaders },
  });
  if (!res.ok) throw new Error(`抓取失败 HTTP ${res.status}`);
  return res.text();
}

// 绕过 YouTube 同意墙（cookieless 请求会被重定向到 consent 页、丢掉 captionTracks）
const YT_COOKIE = "CONSENT=YES+cb; SOCS=CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg";

function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/(?:embed|shorts)\/([\w-]{11})/);
  return m ? m[1] : null;
}

type CaptionTrack = { baseUrl: string; languageCode?: string; kind?: string };

// InnerTube player 接口回退：watch 页常已不内嵌 captionTracks，改用 ANDROID 客户端取。
async function innerTubeTracks(id: string, apiKey: string): Promise<CaptionTrack[]> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      context: {
        client: { clientName: "ANDROID", clientVersion: "19.09.37", androidSdkVersion: 30, hl: "zh-CN" },
      },
      videoId: id,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

async function fetchYouTube(url: string): Promise<IngestResult> {
  const id = youtubeId(url);
  if (!id) throw new Error("无法从链接里解析出 YouTube 视频 ID");
  const html = await get(`https://www.youtube.com/watch?v=${id}&hl=en`, { Cookie: YT_COOKIE });
  const title = (html.match(/<meta name="title" content="([^"]*)"/) || [])[1] || "";

  let tracks: CaptionTrack[] = [];
  const tracksMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (tracksMatch) {
    try {
      tracks = JSON.parse(tracksMatch[1].replace(/\\u0026/g, "&"));
    } catch {
      /* fall through to InnerTube */
    }
  }
  if (!tracks.length) {
    const apiKey = (html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1];
    if (apiKey) tracks = await innerTubeTracks(id, apiKey);
  }
  if (!tracks.length)
    throw new Error("这个视频没有可抓取的字幕（或被限制）。可手动粘贴文字。");
  // 优先中文，其次英文，再次第一条
  const pick =
    tracks.find((t) => t.languageCode?.startsWith("zh")) ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];
  const xml = await get(pick.baseUrl);
  const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
    decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim()
  );
  const text = lines.filter(Boolean).join(" ");
  if (!text) throw new Error("字幕为空");
  return { text, source: "youtube", title };
}

async function fetchWeChat(url: string): Promise<IngestResult> {
  const html = await get(url);
  const title =
    (html.match(/<h1[^>]*class="rich_media_title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").trim() ||
    (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] ||
    "";
  const bodyMatch =
    html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*id="js_/) ||
    html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>/);
  const body = bodyMatch ? htmlToText(bodyMatch[1]) : "";
  if (!body || body.length < 30)
    throw new Error("没抓到公众号正文（可能需登录/已删/防爬）。可手动粘贴正文。");
  return { text: (title ? title + "\n\n" : "") + body, source: "wechat", title };
}

async function fetchGeneric(url: string): Promise<IngestResult> {
  const html = await get(url);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]?.trim() || "";
  const text = htmlToText(html).slice(0, 12000);
  if (!text || text.length < 30) throw new Error("没抓到正文");
  return { text, source: "web", title };
}

export async function ingestUrl(url: string): Promise<IngestResult> {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) throw new Error("请输入以 http(s):// 开头的链接");
  if (/youtube\.com|youtu\.be/i.test(u)) return fetchYouTube(u);
  if (/mp\.weixin\.qq\.com/i.test(u)) return fetchWeChat(u);
  return fetchGeneric(u);
}
