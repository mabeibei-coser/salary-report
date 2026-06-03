import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 优先加载 .env.local，否则回退 .env
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const { default: express } = await import("express");
const { getSession } = await import("./lib/session.js");
const { getDb, upsertUserByPhone, insertReport, findCachedReport } = await import("./lib/db.js");

const QUERY_CACHE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天内同条件查询直接复用历史结果，保证一致性
const PORT = Number(process.env.PORT) || 4001;
const IFLYTEK_URL =
  process.env.IFLYTEK_API_URL ||
  "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2/chat/completions";
const IFLYTEK_API_KEY =
  process.env.IFLYTEK_API_KEY || process.env.VITE_GLM_API_KEY;
const IFLYTEK_MODEL =
  process.env.IFLYTEK_MODEL || process.env.VITE_GLM_MODEL || "astron-code-latest";

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));

const PHONE_RE = /^1\d{10}$/;

function requireSession(handler) {
  return async (req, res) => {
    const session = await getSession(req, res);
    if (!session.userId) {
      return res.status(401).json({ error: "请先登录" });
    }
    req.session = session;
    return handler(req, res);
  };
}

// ── 登录 / 登出 / 当前用户 ──

app.post("/api/login", async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: "请输入有效的 11 位手机号" });
  }
  try {
    const userId = upsertUserByPhone(phone);
    const session = await getSession(req, res);
    session.userId = userId;
    session.phone = phone;
    session.loggedInAt = Date.now();
    await session.save();
    res.json({ ok: true, userId, phone });
  } catch (err) {
    console.error("[login] failed:", err);
    res.status(500).json({ error: "登录失败，请稍后重试" });
  }
});

app.post("/api/logout", async (req, res) => {
  const session = await getSession(req, res);
  await session.destroy();
  res.json({ ok: true });
});

app.get("/api/me", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: "未登录" });
  res.json({ userId: session.userId, phone: session.phone });
});

// ── 查询：调讯飞 + 入库（一次性原子）──

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
      if (cachedReport) {
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

    if (!IFLYTEK_API_KEY) {
      return res.status(500).json({ error: "服务器未配置 AI API key" });
    }

    const startedAt = Date.now();
    try {
      const upstream = await fetch(IFLYTEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${IFLYTEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: IFLYTEK_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserMessage({ position, company, rank, education, city }) },
          ],
          temperature: 0.3,
          max_tokens: 6144,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        console.error("[queries] iFlytek HTTP", upstream.status, text.slice(0, 300));
        return res.status(502).json({ error: `AI 请求失败 (${upstream.status})` });
      }

      const result = await upstream.json();
      const content = result?.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(502).json({ error: "AI 返回内容为空" });
      }

      let cleaned = String(content).trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      let report;
      try {
        report = JSON.parse(cleaned);
      } catch {
        return res.status(502).json({ error: "AI 返回内容不是有效 JSON" });
      }

      report = validateAndNormalize(report, { position, company, rank, education, city });

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
    } catch (err) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return res.status(504).json({ error: "请求超时（60秒），请稍后重试" });
      }
      console.error("[queries] failed:", err);
      res.status(500).json({ error: "查询失败，请稍后重试" });
    }
  })
);

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

// ── 讯飞 prompt（与原 src/services/api.js 一致）──
const SYSTEM_PROMPT = `你是一位资深的中国薪酬数据分析专家。你必须综合用户提供的【岗位名称、企业性质、职级、最高学历、所在城市】所有五项信息，生成一份精准的结构化薪酬数据报告，薪酬数据风格为偏低保守风格。

## 输出要求

必须是纯JSON（不要markdown包裹），格式如下：

{
  "position": "岗位名称",
  "company": "企业性质",
  "rank": "职级代码",
  "rankLabel": "职级标签",
  "rankCategory": "tech或mgmt",
  "education": "学历",
  "city": "城市",
  "rankLadder": [{"rank": "职级代码", "rankLabel": "职级标签", "category": "tech或mgmt", "monthly": 月薪p50, "annual": 年薪p50}],
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
  "highEarnerTraits": "该岗位较高薪资人群的特点描述，200字以内"
}

## 生成工作流（必须严格按此顺序执行，不可跳步）

### 第一步：先生成 rankLadder 全职级薪酬锚定表

仅基于【岗位 + 最高学历 + 企业性质 + 所在城市】四个参数（**暂不考虑用户选择的职级**），按下方"职级具体化描述"，推理出该岗位在该企业性质 + 该学历 + 该城市层级下，从 P1 到 P9、M1 到 M5 共 14 个职级各自的月薪中位数（p50）与年薪中位数（p50）。

填入 JSON 的 rankLadder 字段，要求：
- **必须 14 条**，顺序固定：P1, P2, P3, P4, P5, P6, P7, P8, P9, M1, M2, M3, M4, M5
- rank 字段填职级代码（如"P5"），rankLabel 填该职级的完整标签（如"P5(资深/工程师)"），category 填 "tech"（P 序列）或 "mgmt"（M 序列）
- monthly、annual 都是正整数，单位元，精确到百元
- **P1→P9 严格单调递增**；**M1→M5 严格单调递增**
- 管理岗略高于同档 P 序列：M1≈P4×1.08-1.15、M2≈P5×1.05-1.12、M3≈P6×1.0-1.10、M4≈P7×1.10-1.20、M5≈P8×1.10-1.20
- 整张表的薪酬基准已经把"岗位 + 企业性质系数 + 学历加成 + 城市层级"全部计算进去；后续第二步不再重复套这些系数

### 第二步：从 rankLadder 摘取用户选择的职级数据

从第一步生成的 rankLadder 中找到用户选择的职级，取出其 monthly 作为本报告的 monthly.p50、annual 作为 annual.p50。**monthly.p50 必须严格等于 rankLadder 对应行的 monthly；annual.p50 必须严格等于 rankLadder 对应行的 annual**（保证报告与锚定表自洽）。

再按 spread = 18%-32%（视行业波动幅度）反推：
- monthly.p25 = round(monthly.p50 × (1 - spread × 0.45) / 100) × 100
- monthly.p75 = round(monthly.p50 × (1 + spread × 0.45) / 100) × 100
- annual.p25、annual.p75 同理（也可由对应 monthly × (12 + bonusMonths) 推导，保持自洽）

### 第三步：展开其余字段

基于第二步的 monthly/annual，按下方"核心规则"展开 bonusMonths、equity、housingFund、hourlyRate、marketComparison、salaryTrend、industryAnalysis、cityAnalysis、highEarnerTraits。

## 职级具体化描述（用于第一步全表推理 + 第二步精准匹配）

### 技术/专业序列（P1-P9）
- **P1（文员/助理）**：0-1 年经验；执行事务性、流程化的具体动作；完全在上级指导下工作；典型产出：数据录入、文档整理、跑流程辅助。
- **P2（初级专员/技术员）**：1-3 年；做标准化、可重复的具体任务；遇到非标问题需上级介入；典型产出：完成单个小功能/小模块、按 checklist 执行。
- **P3（中级）**：3-5 年；独立完成中等复杂度任务、需偶尔指导；开始参与方案讨论；典型产出：独立交付小项目、可 review 初级同学产出。
- **P4（高级专员/技术员，行业基准位）**：5-8 年；独立负责一个完整功能/子系统，主动做方案选型；可带 1-2 名初级；典型产出：完整子模块设计与交付、能写技术设计文档。
- **P5（资深/工程师）**：7-10 年；独立攻坚复杂技术问题，跨模块整合能力；非正式 tech lead，影响 3-5 人小组；典型产出：主导核心系统设计与落地、能拆解模糊需求为可执行方案。
- **P6（专家/独立负责）**：8-12 年；独立负责一个完整业务方向或核心系统；跨团队协作；典型产出：主导一条业务线技术或一个核心平台，结果对业务指标负责。
- **P7（高级专家/模块负责人）**：10-15 年；负责一个大模块/技术栈，对该领域有公司级影响力；带 5-15 人虚拟团队；典型产出：定义技术战略、主导大型重构、跨团队治理。
- **P8（资深专家/领域负责人）**：13 年以上；负责一个完整技术领域或多条业务线的技术决策；公司级技术权威；典型产出：制定公司级技术架构，技术决策影响 100+ 工程师。
- **P9（首席/行业权威）**：15 年以上；公司技术战略制定者，业界知名；典型产出：制定 5-10 年技术路线、对外代表公司技术品牌。

### 管理序列（M1-M5）
- **M1（团队主管）**：5 年以上；管理 3-8 人执行型小组；本人同时承担 30-50% 个人产出；典型产出：带小组完成季度 OKR、做 1on1 与绩效。
- **M2（经理）**：7 年以上；管理 8-20 人，下设 1-2 个 M1 或资深骨干；基本不再做个人执行产出；典型产出：完成部门 OKR、负责团队招聘培养。
- **M3（高级经理）**：10 年以上；管理 20-50 人或多个 M2 团队；参与公司中层决策；典型产出：完成一条业务方向的年度目标、组织建设。
- **M4（总监）**：12 年以上；管理 50-200 人或多条业务线；进入公司核心决策圈；典型产出：完成公司战略级目标、组织架构设计。
- **M5（副总裁）**：15 年以上；管理事业部 200 人以上，向 CEO 汇报；典型产出：完成事业部 P&L、董事会汇报。

## 核心规则

### 1. 五维参数都必须影响数据（在第一步全表推理时统一计入，第二步不重复套）
- **岗位名称**：决定薪酬基准。技术岗（开发/算法/架构）高于职能岗（行政/人事），管理岗高于执行岗
- **企业性质**：外资企业薪酬最高（系数约1.10），合资次之（1.05），国有企业福利好、公积金比例高但薪酬较低（0.85）。民营企业居中，初创公司波动大
- **职级**：按上面"职级具体化描述"精确匹配；管理序列同档薪酬高于 P 序列
- **最高学历**：博士>硕士>MBA>本科>大专>高中。硕士比本科高约15-20%，博士比硕士高约15-20%。MBA在管理岗有额外加成
- **所在城市**：用户选择城市层级，需根据层级自动生成该层级的典型城市数据。一线城市（北上广深）薪酬为基准100%，二线城市（杭州/成都/武汉/南京/苏州/西安等）约为一线80-85%，三四线城市约为一线50-70%

### 2. 数据合理性
- monthly月薪单位元，所有值为整数
- annual年薪 = 月薪 × (12 + 年终奖月数)
- hourlyRate时薪 = 月薪 ÷ (21.75 × 8)
- housingFund公积金 = 月薪 × (个人比例+公司比例)，国有企业比例最高12%+12%，民企5%+5%
- equity股权：初创公司和外资企业较高，国有企业通常为0
- bonusMonths年终奖月数：外企2-5个月，国企1-4个月，民企1-3个月，初创0-5个月

### 3. salaryTrend 近5年薪酬趋势
必须返回 5 个数据点，year 依次为 2022、2023、2024、2025、2026（升序）。monthly 为该年该岗位在指定企业性质 + 城市的月薪中位数（元，整数）。2026 年的值需与本报告 monthly.p50 一致。**必须严格单调递增**：每一年必须比上一年高，每年涨幅 0%-5.5% 之间（根据该行业实际行情估算，可以快涨或缓涨，但不允许回调/下降/持平）。

### 4. industryAnalysis 细分行业（必须15个）
根据岗位推荐相关细分行业，如"金融科技"、"在线教育"、"电商零售"等。每个行业给出月薪范围、年薪范围、人才需求等级、"salaryIncrease"为上一年度行业平均涨薪幅度（必须在1.5%-5.5%之间，格式如"3.2%"）。

### 5. cityAnalysis 城市对比（6个典型城市）
根据用户选择的城市层级，从该层级中选取6个典型城市：
- 一线城市：北京、上海、广州、深圳、杭州、成都
- 二线城市：杭州、成都、武汉、南京、苏州、西安
- 三四线城市：长沙、合肥、郑州、昆明、南昌、贵阳
每个城市给出月薪均值、生活成本指数（北京=100）、薪酬水平、城市优势。

### 6. 2026年中国市场
数据要反映2026年中国就业市场偏低的保守水平，所有金额精确到百元。`;

function buildUserMessage({ position, company, rank, education, city }) {
  return `请综合以下五项信息生成薪酬报告：
- 岗位名称：${position}
- 企业性质：${company}
- 岗位职级：${rank}
- 最高学历：${education}
- 所在城市：${city}

请严格按系统提示的JSON格式返回完整数据，确保所有五项参数都体现在薪酬数据中。`;
}

// 14 个标准职级 + 相对 P4(=1.00) 的系数（与 src/data/salaryDatabase.js 的 rankMultiplier 对齐，
// 用于 AI 漏返/返错 rankLadder 时的兜底回填）
const STANDARD_RANK_LADDER = [
  { rank: "P1", rankLabel: "P1(文员/助理)", category: "tech", mult: 0.40 },
  { rank: "P2", rankLabel: "P2(初级专员/技术员)", category: "tech", mult: 0.55 },
  { rank: "P3", rankLabel: "P3(中级)", category: "tech", mult: 0.78 },
  { rank: "P4", rankLabel: "P4(高级专员/技术员)", category: "tech", mult: 1.00 },
  { rank: "P5", rankLabel: "P5(资深/工程师)", category: "tech", mult: 1.30 },
  { rank: "P6", rankLabel: "P6(专家/独立负责)", category: "tech", mult: 1.65 },
  { rank: "P7", rankLabel: "P7(高级专家/模块负责人)", category: "tech", mult: 1.85 },
  { rank: "P8", rankLabel: "P8(资深专家/领域负责人)", category: "tech", mult: 2.10 },
  { rank: "P9", rankLabel: "P9(首席/行业权威)", category: "tech", mult: 2.80 },
  { rank: "M1", rankLabel: "M1(团队主管)", category: "mgmt", mult: 1.10 },
  { rank: "M2", rankLabel: "M2(经理)", category: "mgmt", mult: 1.45 },
  { rank: "M3", rankLabel: "M3(高级经理)", category: "mgmt", mult: 1.85 },
  { rank: "M4", rankLabel: "M4(总监)", category: "mgmt", mult: 2.40 },
  { rank: "M5", rankLabel: "M5(副总裁)", category: "mgmt", mult: 3.10 },
];

function validateAndNormalize(data, params) {
  data.position = data.position || params.position;
  data.company = data.company || params.company;
  data.rank = data.rank || params.rank;
  data.rankLabel = data.rankLabel || params.rank;
  data.rankCategory = data.rankCategory || "tech";
  data.education = data.education || params.education;
  data.city = data.city || params.city;

  for (const key of ["monthly", "annual", "bonusMonths", "equity", "housingFund", "hourlyRate"]) {
    data[key] = data[key] || {};
    for (const p of ["p25", "p50", "p75"]) {
      data[key][p] = Math.round(Number(data[key]?.[p]) || 0);
    }
  }

  // ── rankLadder 全职级薪酬锚定表兜底 ──
  // 期望：14 条，顺序 P1-P9 + M1-M5，每条 { rank, rankLabel, category, monthly, annual }
  // 失败兜底：基于本报告 monthly.p50 + 用户职级，反推该岗位的 P4 基准月薪，再按 STANDARD_RANK_LADDER 系数生成全表
  const ladderInput = Array.isArray(data.rankLadder) ? data.rankLadder : [];
  const ladderByRank = new Map();
  for (const item of ladderInput) {
    if (!item || typeof item !== "object") continue;
    const rk = String(item.rank || "").trim().toUpperCase();
    if (!rk) continue;
    ladderByRank.set(rk, {
      rank: rk,
      rankLabel: item.rankLabel || rk,
      category: item.category === "mgmt" ? "mgmt" : "tech",
      monthly: Math.round(Number(item.monthly) || 0),
      annual: Math.round(Number(item.annual) || 0),
    });
  }

  const allLadderOk = STANDARD_RANK_LADDER.every((std) => {
    const got = ladderByRank.get(std.rank);
    return got && got.monthly > 0 && got.annual > 0;
  });

  if (!allLadderOk) {
    // 用户选择的职级在标准表里的系数，结合 monthly.p50 推导 P4 基准
    const userRankStd = STANDARD_RANK_LADDER.find((s) => s.rank === data.rank);
    const p50 = data.monthly.p50 || 0;
    const baseP4 = userRankStd && p50 > 0 ? p50 / userRankStd.mult : p50 || 18000;
    // 年终奖月数（用于 annual = monthly × (12 + bonus)），缺失时按 2 个月兜底
    const bonusForAnnual = Number(data.bonusMonths?.p50) > 0 ? Number(data.bonusMonths.p50) : 2;
    data.rankLadder = STANDARD_RANK_LADDER.map((std) => {
      const monthly = Math.round(baseP4 * std.mult / 100) * 100;
      const annual = Math.round(monthly * (12 + bonusForAnnual) / 100) * 100;
      return {
        rank: std.rank,
        rankLabel: std.rankLabel,
        category: std.category,
        monthly,
        annual,
      };
    });
  } else {
    // AI 给齐了 14 条，但顺序可能错乱 → 按 STANDARD_RANK_LADDER 顺序重排，并补齐缺失的 rankLabel/category
    data.rankLadder = STANDARD_RANK_LADDER.map((std) => {
      const got = ladderByRank.get(std.rank);
      return {
        rank: std.rank,
        rankLabel: got.rankLabel || std.rankLabel,
        category: got.category || std.category,
        monthly: got.monthly,
        annual: got.annual,
      };
    });
    // 单调性校正：P1-P9 必须递增，M1-M5 必须递增
    const pSeries = data.rankLadder.filter((r) => r.category === "tech");
    const mSeries = data.rankLadder.filter((r) => r.category === "mgmt");
    for (const series of [pSeries, mSeries]) {
      for (let i = 1; i < series.length; i++) {
        if (series[i].monthly <= series[i - 1].monthly) {
          series[i].monthly = Math.round(series[i - 1].monthly * 1.05 / 100) * 100;
          const bonus = Number(data.bonusMonths?.p50) > 0 ? Number(data.bonusMonths.p50) : 2;
          series[i].annual = Math.round(series[i].monthly * (12 + bonus) / 100) * 100;
        }
      }
    }
  }

  // ── 摘取自洽：monthly.p50 / annual.p50 必须等于 rankLadder 中对应职级的 monthly/annual ──
  const ladderRow = data.rankLadder.find((r) => r.rank === data.rank);
  if (ladderRow) {
    if (ladderRow.monthly > 0) data.monthly.p50 = ladderRow.monthly;
    if (ladderRow.annual > 0) data.annual.p50 = ladderRow.annual;
    // p25/p75 若错乱（≤0 或顺序倒置），按 ±13% 重算（落在 prompt 要求的 spread 中段）
    if (!(data.monthly.p25 > 0 && data.monthly.p25 < data.monthly.p50)) {
      data.monthly.p25 = Math.round(data.monthly.p50 * 0.87 / 100) * 100;
    }
    if (!(data.monthly.p75 > data.monthly.p50)) {
      data.monthly.p75 = Math.round(data.monthly.p50 * 1.13 / 100) * 100;
    }
    if (!(data.annual.p25 > 0 && data.annual.p25 < data.annual.p50)) {
      data.annual.p25 = Math.round(data.annual.p50 * 0.87 / 100) * 100;
    }
    if (!(data.annual.p75 > data.annual.p50)) {
      data.annual.p75 = Math.round(data.annual.p50 * 1.13 / 100) * 100;
    }
  }

  data.marketComparison = data.marketComparison || {};
  data.marketComparison.marketAvgMonthly = Math.round(Number(data.marketComparison.marketAvgMonthly) || 0);
  data.marketComparison.diffPct = Math.round(Number(data.marketComparison.diffPct) || 0);

  data.salaryTrend = (Array.isArray(data.salaryTrend) ? data.salaryTrend : []).map((item) => ({
    year: Math.round(Number(item.year) || 0),
    monthly: Math.round(Number(item.monthly) || 0),
  })).filter((item) => item.year > 0 && item.monthly > 0)
    .sort((a, b) => a.year - b.year);

  // 兜底 + 单调性校正：
  // 1) 长度不足 5 时，基于当前 p50 回填线性递增（每年约 4.5%）
  // 2) AI 返回了 5 个点但出现持平/下降时，用前一年 × 1.025 修正成单调递增，再把末年钉成 p50
  const trendOk = data.salaryTrend.length === 5
    && data.salaryTrend.every((d, i) => i === 0 || Number(d.monthly) > Number(data.salaryTrend[i - 1].monthly));
  if (!trendOk) {
    const p50 = data.monthly.p50 || 0;
    if (p50 > 0) {
      if (data.salaryTrend.length === 5) {
        // 保留 AI 估算的形状，但强制每年至少涨 2.5%（落在 0-5.5% 中间值）
        for (let i = 1; i < 5; i++) {
          const prev = Number(data.salaryTrend[i - 1].monthly);
          const cur = Number(data.salaryTrend[i].monthly);
          if (!(cur > prev)) {
            data.salaryTrend[i].monthly = Math.round(prev * 1.025 / 100) * 100;
          }
        }
        data.salaryTrend[4].monthly = p50;
      } else {
        data.salaryTrend = [2022, 2023, 2024, 2025, 2026].map((y, i) => ({
          year: y,
          monthly: Math.round(p50 * (0.82 + 0.045 * i) / 100) * 100,
        }));
        data.salaryTrend[4].monthly = p50;
      }
    }
  }

  data.industryAnalysis = (Array.isArray(data.industryAnalysis) ? data.industryAnalysis : []).map((item) => ({
    industry: item.industry || "未命名行业",
    description: item.description || "",
    monthlyRange: item.monthlyRange || "--",
    annualRange: item.annualRange || "--",
    demandLevel: item.demandLevel || "中",
    salaryIncrease: item.salaryIncrease || "--",
  }));

  data.cityAnalysis = (Array.isArray(data.cityAnalysis) ? data.cityAnalysis : []).map((item) => ({
    city: item.city || "",
    monthlyAvg: Math.round(Number(item.monthlyAvg) || 0),
    costIndex: Math.round(Number(item.costIndex) || 100),
    salaryLevel: item.salaryLevel || "中",
    advantage: item.advantage || "",
  }));

  data.highEarnerTraits =
    data.highEarnerTraits ||
    "该岗位较高薪资人群通常具备：丰富行业经验、核心项目主导能力、跨部门协作经验、持续学习与技术迭代能力。";

  return data;
}
