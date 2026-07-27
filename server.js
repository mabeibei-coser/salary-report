import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 优先加载 .env.local，否则回退 .env
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const { default: express } = await import("express");
const { getSession } = await import("./lib/session.js");
const { getDb, upsertUserByPhone, insertReport, findCachedReport, getReportByIdForPhone } = await import("./lib/db.js");
const {
  BananaRouterJsonError,
  generateJsonWithBananaRouter,
  getBananaRouterJsonConfig,
} = await import("./lib/bananarouter-gemini-json.js");
const { hasCompletePositionProfile, hasRequiredReportShape } = await import("./lib/report-schema.js");

const QUERY_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const PORT = Number(process.env.PORT) || 4001;
const CENTER_BASE_URL = process.env.ATA_CENTER_BASE_URL || "http://localhost:4004";

// 主模型：BananaRouter Gemini-native；旧 VITE_GLM_* 不再进入服务端主链。
const PRIMARY_CONFIG = getBananaRouterJsonConfig();

// 备用模型：env 全配上时启用；任一为空都跳过备用，主模型失败直接报错
const BACKUP_URL = process.env.BACKUP_API_URL || "";
const BACKUP_KEY = process.env.BACKUP_API_KEY || "";
const BACKUP_MODEL = process.env.BACKUP_MODEL || "";
const BACKUP_ENABLED = !!(BACKUP_URL && BACKUP_KEY && BACKUP_MODEL);

const app = express();
app.set("trust proxy", true);

// 自实现 JSON body 解析，替代 express.json()。
// 起因：线上 nginx → Express 链路上 application/json POST 一律返默认 HTML 400 "Bad Request"，
// 而 form-urlencoded 正常；本地直连同样请求是 200/401。怀疑线上 body-parser 在某些
// 环境下异常或 nginx 改 body。这里完全绕开 body-parser，自己读 raw body 再解析，
// 解析失败时返 JSON 错误（含 receivedPreview）便于继续诊断，而非默认 HTML 400。
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "DELETE") return next();
  const ct = String(req.headers["content-type"] || "").toLowerCase();
  if (!ct.includes("application/json")) return next();
  const chunks = [];
  let total = 0;
  const MAX = 1024 * 1024; // 1MB
  req.on("data", (c) => {
    total += c.length;
    if (total > MAX) {
      req.destroy();
      try { res.status(413).json({ error: "body 超过 1MB" }); } catch {}
    } else chunks.push(c);
  });
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) { req.body = {}; return next(); }
    try {
      req.body = JSON.parse(raw);
      return next();
    } catch (err) {
      return res.status(400).json({
        error: "JSON 解析失败",
        detail: err.message,
        receivedBytes: raw.length,
        receivedPreview: raw.slice(0, 200),
      });
    }
  });
  req.on("error", next);
});

const PHONE_RE = /^1\d{10}$/;

function requireSession(handler) {
  return async (req, res) => {
    const session = await getSession(req, res);
    if (!session.phone) {
      return res.status(401).json({ error: "请先登录", loginUrl: `${CENTER_BASE_URL}/` });
    }
    const localUserId = upsertUserByPhone(session.phone);
    session.userId = localUserId;
    req.session = session;
    return handler(req, res);
  };
}

async function fetchIsVip(req) {
  try {
    const resp = await fetch(`${CENTER_BASE_URL}/api/membership/me`, {
      headers: { cookie: req.headers.cookie || "" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data.isVip;
  } catch (err) {
    console.error("[salary] 查 VIP 失败:", err?.message || err);
    return false;
  }
}

// ── 当前用户 + VIP 状态 ──

app.get("/api/me", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.phone) return res.status(401).json({ error: "未登录", loginUrl: `${CENTER_BASE_URL}/` });
  const localUserId = upsertUserByPhone(session.phone);
  res.json({ userId: localUserId, phone: session.phone });
});

app.get("/api/vip/status", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.phone) return res.status(401).json({ error: "未登录" });
  const isVip = await fetchIsVip(req);
  res.json({ isVip, billingUrl: `${CENTER_BASE_URL}/billing` });
});

// ── 我的历史：按 id 取一条完整报告（供 ATA100 历史详情跳回 A500 渲染）──

app.get(
  "/api/me/history/salary/:id",
  requireSession(async (req, res) => {
    const detail = getReportByIdForPhone(Number(req.params.id), req.session.phone);
    if (!detail) return res.status(404).json({ error: "记录不存在" });
    res.json(detail);
  })
);

// ── 查询：调 Gemini + 入库（一次性原子）──

app.post(
  "/api/queries",
  requireSession(async (req, res) => {
    const { position, company, rank, education, city } = req.body || {};
    if (![position, company, rank, education, city].every((v) => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "请填齐 5 项查询条件" });
    }
    // 缓存命中：30 天内有相同条件（5 项全等）的查询，直接复用历史结果
    const cached = findCachedReport({ position, company, rank, education, city }, QUERY_CACHE_MS);
    if (cached) {
      let cachedReport = null;
      try {
        cachedReport = JSON.parse(cached.report_json);
      } catch {
        cachedReport = null; // 老记录损坏，落到下面重新调 AI
      }
      // 旧缓存没有第 5 部分「岗位画像」时不复用，重新生成新版完整报告。
      if (cachedReport && hasCompletePositionProfile(cachedReport)) {
        const reportId = insertReport({
          userId: req.session.userId,
          userPhone: req.session.phone,
          createdAt: Date.now(),
          position, company, rank,
          rankLabel: cachedReport.rankLabel || cached.rank_label || null,
          education, city,
          report: cachedReport,
          durationMs: 0,
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null,
        });
        return res.json({ ok: true, reportId, report: cachedReport, durationMs: 0, cached: true });
      }
    }

    if (!PRIMARY_CONFIG) {
      return res.status(500).json({ error: "服务器未配置 AI API key" });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage({ position, company, rank, education, city }) },
    ];

    const startedAt = Date.now();
    let report = null;

    // 主模型：坏 JSON 自动重试一次；
    // 超时 / HTTP 错不重试，避免再白等一个 90s。
    for (let attempt = 1; attempt <= 2 && !report; attempt++) {
      try {
        const candidate = await generateJsonWithBananaRouter({
          config: PRIMARY_CONFIG,
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: messages[1].content,
        });
        validateRequiredReportShape(candidate);
        report = candidate;
      } catch (primaryErr) {
        const category =
          primaryErr instanceof BananaRouterJsonError ? primaryErr.category : "unknown";
        console.error(`[queries] 主模型失败(第${attempt}次):`, category);
        if (primaryErr?.kind !== "parse") break;
      }
    }

    // 备用模型（仅当主失败且备用 env 配齐时）
    if (!report && BACKUP_ENABLED) {
      try {
        const candidate = await callLLM({ url: BACKUP_URL, apiKey: BACKUP_KEY, model: BACKUP_MODEL, messages });
        validateRequiredReportShape(candidate);
        report = candidate;
      } catch (backupErr) {
        console.error("[queries] 备用模型失败:", backupErr?.message || backupErr);
      }
    }

    if (!report) {
      return res.status(504).json({ error: "查询超时，请重试" });
    }

    // 岗位名称有效性校验：AI 判定为非真实岗位时，不出报告、不入库，直接退回提示
    if (report.invalid) {
      return res.status(422).json({ error: "非有效岗位，请正确输入岗位名称" });
    }

    // 年薪在服务端按「月薪 ×（12 + 年终奖月数）」算出，保证与月薪自洽
    // （ladder 瘦身后不再让模型各自生成年薪；模型自算的年薪常与月薪差几个百分点）
    if (report?.monthly && report?.bonusMonths) {
      const annualBy = (p) => {
        const m = report.monthly[p];
        const months = 12 + (report.bonusMonths[p] ?? report.bonusMonths.p50 ?? 0);
        return Number.isFinite(m) ? Math.round((m * months) / 100) * 100 : report.annual?.[p];
      };
      report.annual = { p25: annualBy("p25"), p50: annualBy("p50"), p75: annualBy("p75") };
    }

    const durationMs = Date.now() - startedAt;
    const reportId = insertReport({
      userId: req.session.userId,
      userPhone: req.session.phone,
      createdAt: Date.now(),
      position,
      company,
      rank,
      rankLabel: report.rankLabel || null,
      education,
      city,
      report,
      durationMs,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || null,
    });

    res.json({ ok: true, reportId, report, durationMs });
  })
);

// 调用可选的 OpenAI-compatible 备用 endpoint，返回解析后的 JSON 报告。
// 质检只剩一项：返回内容必须能 JSON.parse。任何环节失败都抛异常，由外层决定是否走备用模型。
async function callLLM({ url, apiKey, model, messages }, timeoutMs = 90_000) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 8192 }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!upstream.ok) {
    throw new Error(`HTTP ${upstream.status}`);
  }
  const result = await upstream.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");
  let cleaned = String(content).trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const err = new Error("AI 返回内容不是有效 JSON");
    err.kind = "parse"; // 标记为坏 JSON，供外层决定是否重试
    throw err;
  }
}

// ── 生产模式：托管 dist/ 静态资源 ──
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "dist");
  app.use(express.static(distDir));
  app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => {
  try {
    getDb(); // 触发建表
    console.log(`[salary-report] api server on http://localhost:${PORT}`);
  } catch (err) {
    console.error("[salary-report] DB 初始化失败:", err);
  }
});

// ── 薪酬报告 prompt ──
const SYSTEM_PROMPT = `你是一位资深的中国薪酬数据分析专家。你必须综合用户提供的【岗位名称、企业性质、职级、最高学历、所在城市】所有五项信息，生成一份精准的结构化薪酬数据报告。

## 第零步：岗位名称有效性校验（最高优先级，先于一切其它步骤）

生成任何报告之前，先判断【岗位名称】是否指向一个真实存在的职业 / 岗位 / 工种。

**唯一判断标准：这串字到底对不对应一个真实职业。**只看语义，不要凭它是中文还是英文、是不是缩写、有几个字母来判断。例如 "ABC" 不对应任何职业，所以无效；而 "CEO" 是首席执行官、"CTO" 是首席技术官，是真实职位，所以有效——区别在语义，不在它们都是三个大写字母。

- **有效（必须正常生成完整报告）**：任何能对应到真实职业的写法都算有效，包括：
  - 高管 / 岗位缩写：CEO、CTO、CFO、COO、CMO、CHRO、VP、GM、HRBP、HRD、PM、BD、QA、UI 等——**这些都是真实职位，绝不能因为它们是字母缩写、或长得像乱填就判无效**；
  - 含英文的岗位：Java工程师、AI产品经理、.NET开发；
  - 普通中文岗位及较冷门的工种：薪酬专员、电焊工、口腔修复技师 等。
- **无效（仅此情况返回下方 JSON）**：只有当这串字不对应任何职业——随机字母/数字堆砌、无意义乱填、纯符号、单字重复、明显的占位测试字（例如 "ABC"、"啦啦啦"、"asdfgh"、"123"、"哈哈哈"、"测试一下"、"qwer"）——才判无效。此时**立即停止**，不要生成报告，只返回如下 JSON（有且仅有这一个字段，不要任何其它内容、不要 markdown 包裹）：
{"invalid": true}

**判定从宽：只要有可能是某个真实职业，一律按有效处理并继续生成完整报告；宁可放过个别可疑输入，也不要误伤真实岗位（尤其 CEO/CTO 这类缩写职位）。**

只有通过本步校验后，才继续执行下面的输出要求。

## 输出要求

必须是纯JSON（不要markdown包裹），格式如下：

{
  "position": "岗位名称",
  "company": "企业性质",
  "rank": "职级代码",
  "rankLabel": "职级标签（必须严格逐字复制下方白名单中的字符串，不许新增/删除/替换任何字符）",
  "rankCategory": "tech或mgmt",
  "education": "学历",
  "city": "城市",
  "rankLadder": [{"rank": "职级代码", "monthly": 月薪p50}],
  "monthly": {"p25": 月薪, "p50": 月薪, "p75": 月薪},
  "annual": {"p25": 年薪, "p50": 年薪, "p75": 年薪},
  "bonusMonths": {"p25": 月数, "p50": 月数, "p75": 月数},
  "equity": {"p25": 金额, "p50": 金额, "p75": 金额},
  "housingFund": {"p25": 金额, "p50": 金额, "p75": 金额},
  "hourlyRate": {"p25": 金额, "p50": 金额, "p75": 金额},
  "marketComparison": {"marketAvgMonthly": 金额, "diffPct": 百分比整数},
  "salaryTrend": [{"year": 年份, "monthly": 月薪}],
  "industryAnalysis": [{"industry": "行业", "description": "描述", "monthlyRange": "范围", "annualRange": "范围", "demandLevel": "高/中/低", "salaryIncrease": "上一年度涨薪如 5.5%"}],
  "cityAnalysis": [{"city": "城市名", "monthlyAvg": 月薪均值, "costIndex": 生活成本指数(以北京=100), "salaryLevel": "高/中/低", "advantage": "该城市优势一句话"}],
  "highEarnerTraits": "该岗位 Top 20% 高薪人群的 8 个谈薪筹码，详见下方第 7 条",
  "positionProfile": {
    "jobPerspective": {
      "distinctivePosition": "对本岗位价值重心的鲜明判断",
      "uniqueInsight": "区别于通用岗位说明的独到人才判断",
      "futureOutlook": "未来2-3年的创新与演进判断"
    },
    "coreResponsibilities": ["核心职责，共5条"],
    "coreCompetencies": [{"name": "能力名称", "description": "能力在该岗位中的具体表现"}],
    "coreKpis": [{"name": "KPI名称", "metric": "衡量口径", "target": "建议目标"}],
    "okrDesign": [{"objective": "目标O，共2个", "keyResults": ["KR1", "KR2", "KR3"]}],
    "innovationAchievements": [{"title": "创新方向", "evidence": "可验证的创新业绩表现"}],
    "candidateTrend": {
      "trends": [
        {"category": "数量与层次", "title": "供给判断", "supplyAnalysis": "近3年市场上可获得人选的数量与职级层次变化"},
        {"category": "技能与证据", "title": "供给判断", "supplyAnalysis": "近3年候选人的技能组合、经验深度与成果证据变化"},
        {"category": "来源与流动", "title": "供给判断", "supplyAnalysis": "近3年人才来源、跨界迁移与地域流动变化"}
      ]
    }
  }
}

## 职级标签白名单（顶层 rankLabel 必须严格逐字复制下列字符串，不许新增/删除/替换任何字符，不许重组括号内容）

技术序列（category 必须为 "tech"）：
- P1 → "P1(文员/助理)"
- P2 → "P2(初级专员/技术员)"
- P3 → "P3(中级)"
- P4 → "P4(高级专员/技术员)"
- P5 → "P5(资深/工程师)"
- P6 → "P6(专家/独立负责)"
- P7 → "P7(高级专家/模块负责人)"
- P8 → "P8(资深专家/领域负责人)"
- P9 → "P9(首席/行业权威)"

管理序列（category 必须为 "mgmt"）：
- M1 → "M1(团队主管)"
- M2 → "M2(经理)"
- M3 → "M3(高级经理)"
- M4 → "M4(总监)"
- M5 → "M5(副总裁)"

错误示例（任何下列写法都不合法）：
- "P5中级)" （括号不闭合 / 截断）
- "P8专家(领域负责人)" （丢字 / 重组）
- "P7总监级" （凭空发明）
- "P6高级(独立负责)" （改字）

## 生成工作流（必须严格按此顺序执行，不可跳步）

### 第一步：先生成 rankLadder 全职级薪酬锚定表

仅基于【岗位 + 最高学历 + 企业性质 + 所在城市】四个参数（**暂不考虑用户选择的职级**），按下方"职级具体化描述"，推理出该岗位在该企业性质 + 该学历 + 该城市层级下，从 P1 到 P9、M1 到 M5 共 14 个职级各自的月薪中位数（p50）。

填入 JSON 的 rankLadder 字段，要求：
- **必须 14 条**，顺序固定：P1, P2, P3, P4, P5, P6, P7, P8, P9, M1, M2, M3, M4, M5
- ladder 每行只保留 rank 和 monthly 两个字段（不要 rankLabel / category）；rank 填职级代码（如"P5"）
- monthly 是正整数，单位元，精确到百元
- **P1→P9 严格单调递增**；**M1→M5 严格单调递增**
- 管理岗略高于同档 P 序列：M1≈P4×1.08-1.15、M2≈P5×1.05-1.12、M3≈P6×1.0-1.10、M4≈P7×1.10-1.20、M5≈P8×1.10-1.20
- 整张表的薪酬基准已经把"岗位 + 企业性质系数 + 学历加成 + 城市层级"全部计算进去；后续第二步不再重复套这些系数

### 第二步：从 rankLadder 摘取用户选择的职级数据

从第一步生成的 rankLadder 中找到用户选择的职级，取出其 monthly 作为本报告的 monthly.p50。**monthly.p50 必须严格等于 rankLadder 对应行的 monthly**。annual.p50 = monthly.p50 ×（12 + bonusMonths.p50），保持与月薪自洽。

再按 spread = 18%-32%（视行业波动幅度）反推：
- monthly.p25 = round(monthly.p50 × (1 - spread × 0.45) / 100) × 100
- monthly.p75 = round(monthly.p50 × (1 + spread × 0.45) / 100) × 100
- annual.p25、annual.p75 同理（也可由对应 monthly × (12 + bonusMonths) 推导，保持自洽）

### 第三步：展开其余字段

基于第二步的 monthly/annual，按下方"核心规则"展开 bonusMonths、equity、housingFund、hourlyRate、marketComparison、salaryTrend、industryAnalysis、cityAnalysis、highEarnerTraits、positionProfile。

## 职级具体化描述（用于第一步全表推理 + 第二步精准匹配）

### 技术/专业序列（P1-P9）
- **P1（文员/助理）**：0-1 年经验；执行最基础的辅助性工作，或者重复的事务性操作；完全在上级指导下工作。
- **P2（初级专员/技术员）**：1-2 年；做标准化、可重复的具体任务；遇到非标问题需上级介入。
- **P3（中级）**：2-3 年；仍然是专员级，能够熟练的独立完成一般任务、需偶尔指导。
- **P4（高级专员/技术员，行业基准位）**：3-5 年；能独立完成较复杂任务，本科毕业一般3年左右经验，研究生毕业2年左右经验；可带 1-2 名初级专员工作。
- **P5（资深/工程师）**：5-8 年；能独立攻坚复杂难题，跨部门协调工作，非正式小团队负责人，影响 3-5 人小组。
- **P6（专家/独立负责）**：8-10 年；负责一个完整模块；跨团队协作。
- **P7（高级专家/模块负责人）**：8-12 年；独立熟练负责一个模块/技术栈；带 5-8 人虚拟团队；跨团队协作及资源协调。
- **P8（资深专家/领域负责人）**：10 年以上；独立负责一个大模块/技术栈；带8-20 人虚拟团队；跨团队统筹。；公司级技术权威。
- **P9（首席/行业权威）**：15 年以上；公司技术战略制定者，业界知名；典型产出：制定 5-10 年技术路线、对外代表公司技术品牌。

### 管理序列（M1-M5）
- **M1（团队主管）**：5 年以上；管理 3-5 人执行型小组；本人同时承担 30-50% 个人产出；典型产出：带小组完成季度 OKR、做 1on1 与绩效。
- **M2（经理）**：7 年以上；管理 5-10 人，下设 1-2 个 M1 或资深骨干；基本不再做个人执行产出；典型产出：完成部门 OKR、负责团队招聘培养。
- **M3（高级经理）**：10 年以上；管理 10-30 人或多个 M2 团队；参与公司中层决策；典型产出：完成一条业务方向的年度目标、组织建设。
- **M4（总监）**：12 年以上；管理 30-100 人或多条业务线；进入公司核心决策圈；典型产出：完成公司战略级目标、组织架构设计。
- **M5（副总裁）**：15 年以上；管理事业部 100 人以上，向 CEO 汇报；典型产出：完成事业部 P&L、董事会汇报。

## 核心规则

### 1. 五维参数都必须影响数据（在第一步全表推理时统一计入，第二步不重复套）
- **岗位名称**：决定薪酬基准。技术岗（开发/算法/架构）高于职能岗（行政/人事），管理岗高于执行岗
- **企业性质**：外资企业薪酬最高（系数约1.10），合资次之（1.05），国有企业福利好、公积金比例高但薪酬较低（0.85）。民营企业居中，初创公司波动大
- **职级**：按上面"职级具体化描述"精确匹配；管理序列同档薪酬高于 P 序列
- **最高学历**：博士>硕士>MBA>本科>大专>高中。硕士比本科高约15-20%，博士比硕士高约15-20%。MBA在管理岗有额外加成
- **所在城市**：用户选择城市层级，需根据层级自动生成该层级的典型城市数据。一线城市（北上广深）薪酬为基准100%，二线城市（杭州/成都/武汉/南京/苏州/西安等）约为一线80-85%，三四线城市约为一线60-70%

### 2. 数据合理性
- monthly月薪单位元，所有值为整数
- annual年薪 = 月薪 × (12 + 年终奖月数)
- hourlyRate时薪 = 月薪 ÷ (21.75 × 8)
- housingFund公积金 = 月薪 × (个人比例+公司比例)，国有企业比例最高12%+12%，民企5%+5%
- equity股权：初创公司和外资企业较高，国有企业通常为0
- bonusMonths年终奖月数：外企2-5个月，国企1-4个月，民企1-4个月，初创0-6个月

### 3. salaryTrend 近5年薪酬趋势
必须返回 5 个数据点，year 依次为 2022、2023、2024、2025、2026（升序）。monthly 为该年该岗位在指定企业性质 + 城市的月薪中位数（元，整数）。2026 年的值需与本报告 monthly.p50 一致。**必须严格单调递增**：每一年必须比上一年高，每年涨幅 0%-5.5% 之间（根据该行业实际行情估算，可以快涨或缓涨，但不允许回调/下降/持平）。

### 4. industryAnalysis 细分行业（必须25个）
根据岗位推荐相关细分行业，如"金融科技"、"在线教育"、"电商零售"等。每个行业给出月薪范围、年薪范围、人才需求等级、"salaryIncrease"为上一年度行业平均涨薪幅度（必须在1.5%-6%之间，格式如"3.2%"）。

### 5. cityAnalysis 城市对比（6个典型城市）
根据用户选择的城市层级，从该层级中选取6个典型城市：
- 一线城市：北京、上海、广州、深圳、杭州、成都
- 二线城市：杭州、成都、武汉、南京、苏州、西安
- 三四线城市：长沙、合肥、郑州、昆明、南昌、贵阳
每个城市给出月薪均值、生活成本指数（北京=100）、薪酬水平、城市优势。

### 6. 2026年中国市场
数据要反映2026年中国就业市场的一般平均水平，所有金额精确到百元。

### 7. highEarnerTraits 本岗位 8 个谈薪筹码（Top 20%）（260-340字）
基于【岗位 + 职级 + 企业性质】三项参数定制 **8 条该岗位 Top 20% 高薪人群在面试谈薪 / 在职提薪场景下真实可操作的筹码**。要求：
- **必须刚好 8 条**，依次以「① ② ③ ④ ⑤ ⑥ ⑦ ⑧」开头编号，**每条单独一行**，行末用换行符 \n（即整段是一个含 8 个 \n 分隔的字符串）
- 每条结构：「编号 筹码名（4-8 字）：一句话具体动作（30-60 字）」
- **必须岗位定制**：筹码名和动作要紧贴该岗位真实薪资构成 / 谈判筹码（如：销售岗强调"提成比例 + 大客户业绩"，算法岗强调"论文 / 模型成果 + 大厂背书"，财务岗强调"复杂税务案例 + CPA 等资质"，运营岗强调"GMV / ROI 增量数据"）
- **必须 Top 20% 视角**：筹码要反映该岗位真正进入薪酬前 20% 的人靠什么拿到溢价（稀缺成果 / 头部客户 / 关键资质 / 独占模块 / 不可替代的项目复盘），而不是普通从业者也能罗列的通用动作
- **优先实用**：让用户照着做就有效，例如"先报区间高位留 10% 谈判空间"、"用上一财年的 X 数据反推合理涨幅"、"打包基本工资 + 奖金 + 股权 + 补贴一起谈，留让步空间"
- **避免空话**：不要写"展示自己的能力"、"持续学习"、"积极主动"这类放在任何岗位都成立的废话
- 涉及金额时用相对值（"高 15%"、"提一档"），不要写具体金额
- 总字数 260-340 字，紧凑、可立即落地

### 8. positionProfile 岗位画像（第5部分）

岗位画像必须同时结合【岗位 + 企业性质 + 职级 + 最高学历 + 城市】生成，内容用于招聘、面试和绩效沟通，不是通用岗位说明书。先识别该岗位独有的价值链、关键矛盾和未来变化，再写下列内容：
- **强岗位定制硬规则**：每条都要出现只有该岗位才成立的工作对象、专业动作、交付物、业务场景或衡量结果。把岗位名替换成另一个岗位后仍然成立的内容必须重写。禁止只写“沟通协作、持续学习、积极主动、提质增效、数字化转型”等通用词。
- **jobPerspective 岗位研判**：必须包含以下 3 个非空字段，每项 45-90 字，三项观点不得重复：
  - distinctivePosition（鲜明定位）：明确该岗位当前最核心的价值重心、优先级和取舍；必须给出判断，不能只罗列事实。
  - uniqueInsight（独到判断）：给出一个不显而易见但可用于识别人选的洞察，说明普通合格者与高质量人选的真正分水岭。
  - futureOutlook（创新前瞻）：结合技术、工具、业务模式或组织变化，判断未来 2-3 年该岗位的角色演进和新的结果要求；不能只写“使用 AI 提效”。
- **coreResponsibilities 核心职责**：必须刚好 5 条；每条 18-35 字，写清该职级真正负责的对象、动作和结果；管理岗体现团队/经营责任，专业岗体现交付深度。
- **coreCompetencies 核心能力**：必须刚好 5 项；每项包含 name（4-10字）和 description（20-45字），说明能力在本岗位、本职级中的可观察行为，避免“沟通能力强”等空话。
- **coreKpis 核心 KPI**：必须刚好 5 项；每项包含 name、metric、target。metric 写清衡量口径，target 给出合理的建议目标或区间；目标必须与岗位、企业性质和职级相称。不得把建议目标描述成用户当前企业的真实指标。
- **okrDesign OKR 设计**：必须刚好 2 个 Objective；每个 Objective 必须刚好 3 个 Key Result。O 写结果方向，KR 必须可衡量、可在一个年度或季度内验证，不得与 KPI 简单重复。
- **innovationAchievements 创新业绩表现**：必须刚好 4 项；每项包含 title 和 evidence，描述该岗位领先于常规做法的创新成果，以及应拿出什么量化证据；至少 2 项要体现未来 2-3 年的新工具、新流程或新业务模式。这是业绩标杆示例，不得声称具体人选已经取得这些成果。
- **candidateTrend 近3年人选趋势解读**：只从人才供给侧汇总近 3 年的结构变化，trends 必须刚好 3 条，不按 2024/2025/2026 分年，不得出现 year/years 字段。每条必须包含 category、title（6-12字鲜明供给判断）和 supplyAnalysis（45-90字岗位定制解读）。category 必须按顺序逐字使用“数量与层次”“技能与证据”“来源与流动”，不得替换或调序。
- **供给侧硬规则**：每条的主语只能是“市场上的候选人 / 从业者 / 人才供给”，回答“市场上什么人变多或变少、什么能力与成果证据稀缺、人才从哪里转入转出”。title 和 supplyAnalysis 禁止出现“需求、招聘、企业、用人、雇主、偏好、岗位空缺、职位空缺、更受青睐、用工缺口”等需求侧表述。写完必须逐条自检，命中任一禁词就改写。
- **趋势事实边界**：人选趋势仅做方向性市场研判。没有可靠样本时禁止虚构招聘人数、简历样本量、精确占比或引用不存在的调研机构。`;

function buildUserMessage({ position, company, rank, education, city }) {
  return `请综合以下五项信息生成薪酬报告：
- 岗位名称：${position}
- 企业性质：${company}
- 岗位职级：${rank}
- 最高学历：${education}
- 所在城市：${city}

请严格按系统提示的JSON格式返回完整数据，确保所有五项参数都体现在薪酬数据中。
不得省略任何数组项：rankLadder 必须14条、salaryTrend 必须5条、industryAnalysis 必须25条、cityAnalysis 必须6条；positionProfile 的岗位研判3项字段必须完整，职责/能力/KPI/OKR/创新业绩/供给侧趋势必须分别为5/5/5/2/4/3条。`;
}

function validateRequiredReportShape(report) {
  if (hasRequiredReportShape(report)) return;
  const error = new BananaRouterJsonError(
    "schema_invalid",
    "BananaRouter 返回的报告结构或供给侧口径不合格",
    "parse",
  );
  throw error;
}
