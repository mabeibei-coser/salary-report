# prompt-eval

精调 salary-report 的报告生成 system prompt 用的。基于 [promptfoo](https://github.com/promptfoo/promptfoo)。

## 一句话原理

把 server.js 里的 system prompt 抽到 `prompts/salary-system-v1.yaml`，用 5 个典型场景跑讯飞 API，看输出是否满足 prompt 里规定的硬规则（5 个趋势点单调递增 / 15 个行业 / 6 个城市 / p25<p50<p75 等）。

改 prompt → 跑一次 → 看哪条 assertion 变红 / 变绿 → 决定要不要保留。

## 跑一次

```powershell
# 在 salary-report/ 目录下
npm run eval:prompt
```

第一次会自动下载 promptfoo（~50MB），后续走缓存。

跑完看 web UI（带颜色对比）：

```powershell
npx promptfoo view
```

浏览器自动打开 `http://localhost:15500`，可以看到每个用例的输入、输出、哪条 assertion pass/fail。

## 怎么精调（典型工作流）

1. **基线**：先跑一次 v1，看哪几条 assertion fail——这些是当前 prompt 没解决的问题
2. **改进**：复制 `prompts/salary-system-v1.yaml` → `salary-system-v2.yaml`，针对 fail 的项改 prompt
3. **对比**：在 `promptfooconfig.yaml` 里把 v2 那行解开注释，再跑 `npm run eval:prompt`
4. **决策**：web UI 会**并排**显示 v1 vs v2 两列，逐条看哪个赢
5. **采纳**：v2 赢了 → 用 v2 的内容覆盖 server.js 里的 `SYSTEM_PROMPT`

## 文件结构

```
prompt-eval/
├── promptfooconfig.yaml     # 主配置（providers + defaultTest + 5 个测试用例都在这里）
└── prompts/
    └── salary-system-v1.yaml  # 当前 prompt = server.js 第 204-272 行抽出来
```

`defaultTest.assert` 里定义了 6 条通用断言（每个用例自动跑），具体测试用例只需要列 vars + 该用例独有的 assert。

## 加新测试用例

在 `promptfooconfig.yaml` 的 `tests:` 数组里加，格式抄已有的：

```yaml
- description: "你的场景描述"
  vars:
    position: "..."
    company: "..."
    rank: "..."
    education: "..."
    city: "..."
  # 6 条通用断言自动跑，这里只写该用例独有的
  assert:
    - type: javascript
      value: |
        const r = JSON.parse(output);
        return r.xxx === '期望值' || `xxx 错了`;
```

## 常见问题

**Q: 报错 "API key not configured" 或 401**
A: `npm run eval:prompt` 用 dotenv-cli 加载 `.env.local`，确认 .env.local 里有 `IFLYTEK_API_KEY=xxx`。注意 promptfoo 的 OpenAI SDK provider 调讯飞会返回 401（讯飞不认 OpenAI-specific headers），所以这里用 `http` provider + `transformResponse` 直接发原生 fetch 请求。

**Q: 报错 "json: cannot unmarshal string into ... messages"**
A: promptfoo 的 `{{prompt}}` 在 chat-format 时是 JSON string，body 模板里要用 `{{ prompt | safe }}`（不加 dump，加 safe），让它原样嵌入 JSON 而不被二次序列化或 HTML escape。

**Q: API key 出现在 promptfoo 错误日志里**
A: promptfoo 在错误堆栈里会把完整 request headers 打印出来（包括 Authorization）。定期清 `C:\Users\admin\.promptfoo\logs\` 避免历史日志留 key 痕迹。

**Q: 跑得很慢**
A: 5 个用例 × 6KB 输出 ≈ 1-2 分钟，正常。讯飞速度慢一点。

**Q: 想跑单个用例**
A: 用 promptfoo 的 `--filter-pattern` 参数：
```powershell
npx promptfoo eval -c promptfooconfig.yaml --filter-pattern "外资"
```

**Q: 跟 server.js 的实际报告对得上吗？**
A: 不一定。server.js 里有 `validateAndNormalize` 函数兜底（比如 salaryTrend 不单调时强制修正）。这里测的是**AI 原始输出**，能暴露 prompt 本身的问题。
