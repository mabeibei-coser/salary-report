// 塞一条假报告进 salary.reports，用来验证 admin-hub 端列表/详情/预览渲染。
// 用法：node scripts/seed-fake-report.mjs
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "data", "salary-report.db");
const db = new Database(dbPath);

// 确保有 user
const phone = "13800138000";
let user = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
if (!user) {
  const r = db
    .prepare("INSERT INTO users(phone, created_at, last_login_at) VALUES (?, ?, ?)")
    .run(phone, Date.now(), Date.now());
  user = { id: Number(r.lastInsertRowid) };
}

const report = {
  position: "Java工程师",
  company: "民营企业",
  rank: "P5",
  rankLabel: "P5(高级/独立负责)",
  rankCategory: "tech",
  education: "本科",
  city: "一线城市",
  monthly: { p25: 20000, p50: 24000, p75: 30000 },
  annual: { p25: 280000, p50: 336000, p75: 450000 },
  bonusMonths: { p25: 1.5, p50: 2, p75: 3 },
  equity: { p25: 0, p50: 0, p75: 0 },
  housingFund: { p25: 2400, p50: 2880, p75: 3600 },
  hourlyRate: { p25: 115, p50: 138, p75: 172 },
  marketComparison: { marketAvgMonthly: 22000, diffPct: 9 },
  marketRanking: [
    { company: "外资企业", monthly: 28000, annual: 392000 },
    { company: "合资企业", monthly: 26000, annual: 364000 },
    { company: "民营企业", monthly: 24000, annual: 336000 },
    { company: "国有企业", monthly: 19000, annual: 247000 },
    { company: "初创公司", monthly: 21000, annual: 273000 },
  ],
  industryAnalysis: Array.from({ length: 25 }, (_, i) => ({
    industry: `行业${i + 1}`,
    description: `第 ${i + 1} 个细分行业说明`,
    monthlyRange: "18k–32k",
    annualRange: "25w–45w",
    demandLevel: i % 3 === 0 ? "高" : i % 3 === 1 ? "中" : "低",
    salaryIncrease: `${(2 + i * 0.3).toFixed(1)}%`,
  })),
  cityAnalysis: [
    { city: "北京", monthlyAvg: 27000, costIndex: 100, salaryLevel: "高", advantage: "互联网与金融总部聚集" },
    { city: "上海", monthlyAvg: 26500, costIndex: 98, salaryLevel: "高", advantage: "外资与高端制造业并重" },
    { city: "深圳", monthlyAvg: 26000, costIndex: 92, salaryLevel: "高", advantage: "硬件与新一代信息产业" },
    { city: "广州", monthlyAvg: 23000, costIndex: 85, salaryLevel: "中", advantage: "外贸与零售生态完整" },
    { city: "杭州", monthlyAvg: 24500, costIndex: 80, salaryLevel: "中", advantage: "电商与云计算高地" },
    { city: "成都", monthlyAvg: 21000, costIndex: 70, salaryLevel: "中", advantage: "成本可控、生活宜居" },
  ],
  highEarnerTraits: [
    "① 锚定区间：报薪先报区间高位，比心理价高 10-15%，留谈判空间",
    "② 业绩证据：用上一财年主导的核心项目 + 量化数据（QPS / 故障下降 / 营收）反推合理涨幅",
    "③ 打包谈判：基本工资、年终奖月数、股权、签字费、补贴一起谈，单点让步换打包提升",
    "④ 竞争 offer：手握 1-2 个同梯队公司的口头 / 书面 offer，作为外资 / 大厂报价的横向参照",
    "⑤ 稀缺背书：突出大厂背景 / 跨域全栈能力 / 特定框架深耕，强调「不可被快速替代」",
    "⑥ 节奏控制：第一轮报价不当场接受，48 小时回复，回访时再争取 5-8% 提升",
  ].join("\n"),
};

db.prepare(
  `INSERT INTO reports(
    user_id, user_phone, created_at,
    position, company, rank, rank_label, education, city,
    report_json, duration_ms, ip, user_agent
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).run(
  user.id,
  phone,
  Date.now(),
  report.position,
  report.company,
  report.rank,
  report.rankLabel,
  report.education,
  report.city,
  JSON.stringify(report),
  12345,
  "127.0.0.1",
  "seed-script",
);

console.log("✓ 已写入一条假报告");
const cnt = db.prepare("SELECT COUNT(*) AS c FROM reports").get();
console.log("当前 reports 总数:", cnt.c);
db.close();
