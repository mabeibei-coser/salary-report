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

const QUERY_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const PORT = Number(process.env.PORT) || 4001;
const CENTER_BASE_URL = process.env.ATA_CENTER_BASE_URL || "http://localhost:4004";

// 主模型：讯飞 astron-code-latest
const PRIMARY_URL =
  process.env.IFLYTEK_API_URL ||
  "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2/chat/completions";
const PRIMARY_KEY =
  process.env.IFLYTEK_API_KEY || process.env.VITE_GLM_API_KEY;
const PRIMARY_MODEL =
  process.env.IFLYTEK_MODEL || process.env.VITE_GLM_MODEL || "astron-code-latest";

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

    if (!PRIMARY_KEY) {
      return res.status(500).json({ error: "服务器未配置 AI API key" });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage({ position, company, rank, education, city }) },
    ];

    const startedAt = Date.now();
    let report = null;

    // 主模型
    try {
      report = await callLLM({ url: PRIMARY_URL, apiKey: PRIMARY_KEY, model: PRIMARY_MODEL, messages });
    } catch (primaryErr) {
      console.error("[queries] 主模型失败:", primaryErr?.message || primaryErr);
    }

    // 备用模型（仅当主失败且备用 env 配齐时）
    if (!report && BACKUP_ENABLED) {
      try {
        report = await callLLM({ url: BACKUP_URL, apiKey: BACKUP_KEY, model: BACKUP_MODEL, messages });
      } catch (backupErr) {
        console.error("[queries] 备用模型失败:", backupErr?.message || backupErr);
      }
    }

    if (!report) {
      return res.status(504).json({ error: "查询超时，请重试" });
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

// 调用一个 LLM endpoint，返回解析后的 JSON 报告。
// 质检只剩一项：返回内容必须能 JSON.parse。任何环节失败都抛异常，由外层决定是否走备用模型。
async function callLLM({ url, apiKey, model, messages }, timeoutMs = 60_000) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 6144 }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw new Error(`HTTP ${upstream.status} ${text.slice(0, 200)}`);
  }
  const result = await upstream.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");
  let cleaned = String(content).trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
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

// ── 讯飞 prompt（与原 src/services/api.js 一致）──
const SYSTEM_PROMPT = `你是一位资深的中国薪酬数据分析专家。你必须综合用户提供的【岗位名称、企业性质、职级、最高学历、所在城市】所有五项信息，生成一份精准的结构化薪酬数据报告。

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
  "rankLadder": [{"rank": "职级代码", "rankLabel": "职级标签（同上，必须严格逐字复制白名单）", "category": "tech或mgmt", "monthly": 月薪p50, "annual": 年薪p50}],
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
  "highEarnerTraits": "该岗位较高薪资人群的特点描述，250字以内"
}

## 职级标签白名单（rankLabel / rankLadder[].rankLabel 必须严格逐字复制下列字符串，不许新增/删除/替换任何字符，不许重组括号内容）

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

### 4. industryAnalysis 细分行业（必须15个）
根据岗位推荐相关细分行业，如"金融科技"、"在线教育"、"电商零售"等。每个行业给出月薪范围、年薪范围、人才需求等级、"salaryIncrease"为上一年度行业平均涨薪幅度（必须在1.5%-6%之间，格式如"3.2%"）。

### 5. cityAnalysis 城市对比（6个典型城市）
根据用户选择的城市层级，从该层级中选取6个典型城市：
- 一线城市：北京、上海、广州、深圳、杭州、成都
- 二线城市：杭州、成都、武汉、南京、苏州、西安
- 三四线城市：长沙、合肥、郑州、昆明、南昌、贵阳
每个城市给出月薪均值、生活成本指数（北京=100）、薪酬水平、城市优势。

### 6. 2026年中国市场
数据要反映2026年中国就业市场的一般平均水平，所有金额精确到百元。

### 7. highEarnerTraits 本岗位谈薪/提薪 6 个套路（200-260字）
基于【岗位 + 职级 + 企业性质】三项参数定制 **6 条该岗位在面试谈薪 / 在职提薪场景下真实可操作的具体动作**。要求：
- **必须刚好 6 条**，依次以「① ② ③ ④ ⑤ ⑥」开头编号，**每条单独一行**，行末用 `\n` 换行（即整段是一个含 6 个 `\n` 分隔的字符串）
- 每条结构：「编号 套路名（4-8 字）：一句话具体动作（30-60 字）」
- **必须岗位定制**：套路名和动作要紧贴该岗位真实薪资构成 / 谈判筹码（如：销售岗强调"提成比例 + 大客户业绩"，算法岗强调"论文 / 模型成果 + 大厂背书"，财务岗强调"复杂税务案例 + CPA 等资质"，运营岗强调"GMV / ROI 增量数据"）
- **优先实用**：让用户照着做就有效，例如"先报区间高位留 10% 谈判空间"、"用上一财年的 X 数据反推合理涨幅"、"打包基本工资 + 奖金 + 股权 + 补贴一起谈，留让步空间"
- **避免空话**：不要写"展示自己的能力"、"持续学习"、"积极主动"这类放在任何岗位都成立的废话
- 涉及金额时用相对值（"高 15%"、"提一档"），不要写具体金额
- 总字数 200-260 字，紧凑、可立即落地`;

function buildUserMessage({ position, company, rank, education, city }) {
  return `请综合以下五项信息生成薪酬报告：
- 岗位名称：${position}
- 企业性质：${company}
- 岗位职级：${rank}
- 最高学历：${education}
- 所在城市：${city}

请严格按系统提示的JSON格式返回完整数据，确保所有五项参数都体现在薪酬数据中。`;
}
