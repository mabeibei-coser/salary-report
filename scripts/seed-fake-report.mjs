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
  positionProfile: {
    analysisBasis: {
      position: "Java工程师",
      company: "民营企业",
      rank: "P5",
    },
    jobPerspective: {
      distinctivePosition: "高级 Java 工程师的价值不是多写代码，而是把高风险业务链路做成可持续演进的稳定系统。",
      uniqueInsight: "高质量人选的分水岭不在框架熟练度，而在能否用故障与成本数据证明关键技术取舍。",
      futureOutlook: "未来将从服务开发者转向智能系统编排者，既治理传统链路，也负责 AI 能力的可靠接入。",
    },
    coreResponsibilities: [
      "负责核心业务系统的方案设计与稳定交付",
      "主导复杂技术问题定位、攻关与复盘闭环",
      "推动跨团队接口协同与研发节奏对齐",
      "建立代码质量、发布和可观测性标准",
      "辅导初中级工程师并沉淀工程方法",
    ],
    coreCompetencies: [
      { name: "系统设计", description: "能在业务约束下完成模块拆分、接口设计和技术取舍" },
      { name: "复杂问题攻关", description: "能独立定位跨服务故障并推动根因治理" },
      { name: "工程质量", description: "能用测试、评审和监控机制降低交付风险" },
      { name: "业务理解", description: "能把业务目标翻译为可实施的技术方案" },
      { name: "协同带教", description: "能协调上下游并提升小组整体交付能力" },
    ],
    coreKpis: [
      { name: "交付达成率", metric: "按承诺时间验收的需求占比", target: "≥90%" },
      { name: "线上稳定性", metric: "核心服务可用性与重大故障次数", target: "可用性≥99.9%" },
      { name: "缺陷逃逸率", metric: "上线后发现的严重缺陷占比", target: "≤3%" },
      { name: "性能改善", metric: "关键链路延迟或资源成本改善", target: "年度改善≥15%" },
      { name: "团队赋能", metric: "评审、分享与带教形成的有效沉淀", target: "每季度≥2项" },
    ],
    okrDesign: [
      {
        objective: "提升核心系统的稳定性与可扩展性",
        keyResults: ["关键链路可用性达到99.9%", "完成2项高风险模块治理", "重大故障复发率降至5%以内"],
      },
      {
        objective: "提高研发交付效率和团队工程能力",
        keyResults: ["需求按期验收率达到90%", "核心模块自动化测试覆盖率提升20%", "完成3次可复用工程实践沉淀"],
      },
    ],
    innovationAchievements: [
      { title: "架构提效", evidence: "以延迟、吞吐或资源成本改善数据证明方案价值" },
      { title: "稳定性治理", evidence: "以故障率下降和恢复时间缩短证明治理闭环" },
      { title: "研发自动化", evidence: "以交付周期、人工步骤或缺陷率变化证明提效" },
      { title: "业务创新", evidence: "以新能力带来的收入、转化或用户体验改善证明成果" },
    ],
    candidateTrend: {
      trends: [
        { category: "高并发治理", title: "成熟工程供给偏少", supplyAnalysis: "民营体系中能以P5深度独立治理高并发链路和复杂系统演进的Java工程师人选仍然稀缺。" },
        { category: "结果证据分化", title: "框架经历趋于同质", supplyAnalysis: "Java候选人的框架技能普遍趋同，能以故障率、延迟、吞吐和成本数据证明P5工程结果的人才仍占少数。" },
        { category: "复合技术路径", title: "跨域背景持续增加", supplyAnalysis: "具备民营业务快速迭代经历的人才来源正从单一后端扩展到云原生、数据工程和AI应用方向。" },
      ],
    },
  },
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
