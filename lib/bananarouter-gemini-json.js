const DEFAULT_BASE_URL = "https://api.bananarouter.com";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

export class BananaRouterJsonError extends Error {
  constructor(category, message, kind) {
    super(message);
    this.name = "BananaRouterJsonError";
    this.category = category;
    if (kind) this.kind = kind;
  }
}

export function getBananaRouterJsonConfig(env = process.env) {
  const apiKey = env.BANANAROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: (env.BANANAROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: env.BANANAROUTER_MODEL?.trim() || DEFAULT_MODEL,
  };
}

function safeError(category, status) {
  if (category === "unauthorized") {
    return new BananaRouterJsonError(category, "BananaRouter 鉴权失败");
  }
  if (category === "rate_limited") {
    return new BananaRouterJsonError(category, "BananaRouter 请求受限");
  }
  if (category === "timeout") {
    return new BananaRouterJsonError(category, "BananaRouter 请求超时");
  }
  if (category === "invalid_json") {
    return new BananaRouterJsonError(category, "BananaRouter 返回的报告不是有效 JSON", "parse");
  }
  if (category === "invalid_response") {
    return new BananaRouterJsonError(category, "BananaRouter 返回内容无效");
  }
  if (category === "provider_error") {
    return new BananaRouterJsonError(category, `BananaRouter 上游失败（HTTP ${status}）`);
  }
  return new BananaRouterJsonError("network_error", "BananaRouter 网络请求失败");
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function parseJsonReport(content) {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    throw safeError("invalid_json");
  }
}

export async function generateJsonWithBananaRouter({
  config,
  systemPrompt,
  userPrompt,
  fetchImpl = fetch,
  timeoutMs = 90_000,
}) {
  const endpoint =
    `${config.baseURL.replace(/\/+$/, "")}/v1beta/models/` +
    `${encodeURIComponent(config.model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) throw safeError("unauthorized");
    if (response.status === 429) throw safeError("rate_limited");
    if (!response.ok) throw safeError("provider_error", response.status);

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw safeError("invalid_response");
    }
    const content = extractText(payload);
    if (!content) throw safeError("invalid_response");
    return parseJsonReport(content);
  } catch (error) {
    if (error instanceof BananaRouterJsonError) throw error;
    if (controller.signal.aborted) throw safeError("timeout");
    throw safeError("network_error");
  } finally {
    clearTimeout(timer);
  }
}
