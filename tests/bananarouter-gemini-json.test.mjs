import assert from "node:assert/strict";
import test from "node:test";

import {
  BananaRouterJsonError,
  generateJsonWithBananaRouter,
  getBananaRouterJsonConfig,
} from "../lib/bananarouter-gemini-json.js";

const config = {
  apiKey: "unit-test-placeholder",
  baseURL: "https://example.test",
  model: "gemini-json-test",
};

function assertCategory(category, kind) {
  return (error) => {
    assert.ok(error instanceof BananaRouterJsonError);
    assert.equal(error.category, category);
    if (kind) assert.equal(error.kind, kind);
    assert.doesNotMatch(error.message, /unit-test-placeholder|Authorization|response-secret/);
    return true;
  };
}

test("配置缺少 key 时关闭，并使用统一 Gemini-native 默认值", () => {
  assert.equal(getBananaRouterJsonConfig({}), null);
  assert.deepEqual(getBananaRouterJsonConfig({ BANANAROUTER_API_KEY: " placeholder " }), {
    apiKey: "placeholder",
    baseURL: "https://api.bananarouter.com",
    model: "gemini-3.1-flash-lite",
  });
});

test("准确发送 system/user Gemini body 并解析 JSON fenced content", async () => {
  let capturedUrl = "";
  let capturedInit;
  const report = await generateJsonWithBananaRouter({
    config,
    systemPrompt: "salary system",
    userPrompt: "salary user",
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return Response.json({
        candidates: [{ content: { parts: [{ text: "```json\n{\"monthly\":{\"p50\":20000}}\n```" }] } }],
      });
    },
  });
  assert.equal(
    capturedUrl,
    "https://example.test/v1beta/models/gemini-json-test:generateContent",
  );
  const headers = new Headers(capturedInit.headers);
  assert.equal(headers.get("Authorization"), "Bearer unit-test-placeholder");
  const body = JSON.parse(String(capturedInit.body));
  assert.equal(body.systemInstruction.parts[0].text, "salary system");
  assert.deepEqual(body.contents, [{ role: "user", parts: [{ text: "salary user" }] }]);
  assert.equal(body.generationConfig.maxOutputTokens, 16384);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(report, { monthly: { p50: 20000 } });
});

test("401/403、429 和其他 HTTP 错误安全分类", async () => {
  for (const [status, category] of [
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "rate_limited"],
    [500, "provider_error"],
  ]) {
    await assert.rejects(
      generateJsonWithBananaRouter({
        config,
        systemPrompt: "system",
        userPrompt: "user",
        fetchImpl: async () => new Response("response-secret", { status }),
      }),
      assertCategory(category),
    );
  }
});

test("超时和网络失败被区分且不泄露底层错误", async () => {
  const timeoutFetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
  await assert.rejects(
    generateJsonWithBananaRouter({
      config,
      systemPrompt: "system",
      userPrompt: "user",
      fetchImpl: timeoutFetch,
      timeoutMs: 5,
    }),
    assertCategory("timeout"),
  );
  await assert.rejects(
    generateJsonWithBananaRouter({
      config,
      systemPrompt: "system",
      userPrompt: "user",
      fetchImpl: async () => {
        throw new Error("network response-secret");
      },
    }),
    assertCategory("network_error"),
  );
});

test("坏上游 JSON、空候选和模型坏 JSON 不会冒充成功", async () => {
  const cases = [
    [new Response("not-json", { status: 200 }), "invalid_response"],
    [Response.json({ candidates: [] }), "invalid_response"],
    [Response.json({ candidates: [{ content: { parts: [] } }] }), "invalid_response"],
    [
      Response.json({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }),
      "invalid_json",
      "parse",
    ],
  ];
  for (const [response, category, kind] of cases) {
    await assert.rejects(
      generateJsonWithBananaRouter({
        config,
        systemPrompt: "system",
        userPrompt: "user",
        fetchImpl: async () => response,
      }),
      assertCategory(category, kind),
    );
  }
});
