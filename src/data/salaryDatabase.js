/**
 * Mock薪酬数据库
 *
 * 数据模型：baseSalary(岗位基准月薪) × companyMultiplier(企业性质系数) × rankMultiplier(职级系数)
 * 加上合理的随机波动，确保数据真实可信。
 */

// ── 岗位基准月薪（中位数，单位：元）──
const positionBaseSalary = {
  '软件工程师': 22000,
  '前端工程师': 20000,
  '后端工程师': 22000,
  '全栈工程师': 24000,
  '算法工程师': 28000,
  '数据工程师': 25000,
  'DevOps工程师': 23000,
  '产品经理': 23000,
  '项目经理': 21000,
  '技术总监': 35000,
  '架构师': 32000,
  '数据分析师': 18000,
  '商业分析师': 20000,
  'UI/UX设计师': 17000,
  '人力资源': 14000,
  '财务': 13000,
  '行政': 10000,
  '法务': 15000,
  '销售经理': 16000,
  '市场经理': 17000,
  '运营经理': 16000,
};

// ── 企业性质系数 ──
const companyMultiplier = {
  '外资企业': 1.15,
  '合资企业': 1.05,
  '民营企业': 0.95,
  '国有企业': 0.80,
  '初创公司': 0.90,
};

// ── 职级系数 ──
// P序列(P1-P9): 技术序列
// M序列(M1-M5): 管理序列
// T序列(T1-T9): 技术专家序列
const rankMultiplier = {
  // 技术序列 P1-P9
  'P1': { mult: 0.40, label: 'P1(文员/助理)', category: 'tech' },
  'P2': { mult: 0.55, label: 'P2(初级专员/技术员)', category: 'tech' },
  'P3': { mult: 0.78, label: 'P3(中级)', category: 'tech' },
  'P4': { mult: 1.00, label: 'P4(高级专员/技术员)', category: 'tech' },
  'P5': { mult: 1.30, label: 'P5(资深/工程师)', category: 'tech' },
  'P6': { mult: 1.65, label: 'P6(专家/独立负责)', category: 'tech' },
  'P7': { mult: 1.85, label: 'P7(高级专家/模块负责人)', category: 'tech' },
  'P8': { mult: 2.10, label: 'P8(资深专家/领域负责人)', category: 'tech' },
  'P9': { mult: 2.80, label: 'P9(首席/行业权威)', category: 'tech' },
  // 管理序列 M1-M5
  'M1': { mult: 1.10, label: 'M1(团队主管)', category: 'mgmt' },
  'M2': { mult: 1.45, label: 'M2(经理)', category: 'mgmt' },
  'M3': { mult: 1.85, label: 'M3(高级经理)', category: 'mgmt' },
  'M4': { mult: 2.40, label: 'M4(总监)', category: 'mgmt' },
  'M5': { mult: 3.10, label: 'M5(副总裁)', category: 'mgmt' },
  // 技术专家序列 T1-T9（已移除）
};

// ── 年终奖月数基准 ──
const bonusMonthsBase = {
  '外资企业': { min: 1, mid: 2, max: 5 },
  '合资企业': { min: 1, mid: 2, max: 4 },
  '民营企业': { min: 1, mid: 1.5, max: 3 },
  '国有企业': { min: 1, mid: 2, max: 4 },
  '初创公司': { min: 0, mid: 1, max: 3 },
};

// ── 公积金比例 ──
const housingFundRates = {
  '国有企业': { personal: 0.12, company: 0.12 },
  '外资企业': { personal: 0.07, company: 0.07 },
  '合资企业': { personal: 0.07, company: 0.07 },
  '初创公司': { personal: 0.05, company: 0.05 },
};

// ── 股权/期权基准（年薪占比）──
const equityRatioBase = {
  '外资企业': { p50: 0.10, p90: 0.25 },
  '合资企业': { p50: 0.05, p90: 0.15 },
  '民营企业': { p50: 0.05, p90: 0.18 },
  '国有企业': { p50: 0.00, p90: 0.00 },
  '初创公司': { p50: 0.15, p90: 0.60 },
};

// ── 薪酬结构占比 ──
const salaryStructureBase = {
  '外资企业': { base_pct: 0.60, bonus_pct: 0.15, equity_pct: 0.10, benefit_pct: 0.15 },
  '合资企业': { base_pct: 0.62, bonus_pct: 0.13, equity_pct: 0.08, benefit_pct: 0.17 },
  '民营企业': { base_pct: 0.65, bonus_pct: 0.12, equity_pct: 0.08, benefit_pct: 0.15 },
  '国有企业': { base_pct: 0.55, bonus_pct: 0.10, equity_pct: 0.00, benefit_pct: 0.35 },
  '初创公司': { base_pct: 0.58, bonus_pct: 0.10, equity_pct: 0.20, benefit_pct: 0.12 },
};

// ── 增长预测 ──
const growthRates = {
  '外资企业': { y1: 0.08, y3: 0.28, y5: 0.60 },
  '合资企业': { y1: 0.09, y3: 0.30, y5: 0.65 },
  '民营企业': { y1: 0.10, y3: 0.33, y5: 0.70 },
  '国有企业': { y1: 0.05, y3: 0.18, y5: 0.40 },
  '初创公司': { y1: 0.20, y3: 0.60, y5: 1.50 },
};

// ── 晋升路径 ──
const promotionPaths = {
  'P1': 'P2(初级专员) → P3(中级) → P4(高级)',
  'P2': 'P3(中级) → P4(高级) → P5(资深)',
  'P3': 'P4(高级) → P5(资深) → P6(专家)',
  'P4': 'P5(资深) → P6(专家) → P7(高级专家)',
  'P5': 'P6(专家) → P7(高级专家) → P8(领域负责人)',
  'P6': 'P7(高级专家) → P8(领域负责人) → P9(首席)',
  'P7': 'P8(领域负责人) → P9(首席)',
  'P8': 'P9(首席)',
  'P9': '行业权威 / CTO方向',
  'M1': 'M2(经理) → M3(高级经理) → M4(总监) → M5(VP)',
  'M2': 'M3(高级经理) → M4(总监) → M5(VP)',
  'M3': 'M4(总监) → M5(VP)',
  'M4': 'M5(VP)',
  'M5': 'C-level / 合伙人',
  'T1': 'T2 → T3 → T4 → T5(资深研究员)',
  'T2': 'T3 → T4 → T5(资深研究员) → T6(首席研究员)',
  'T3': 'T4 → T5(资深研究员) → T6(首席研究员) → T7(杰出)',
  'T4': 'T5(资深研究员) → T6(首席研究员) → T7(杰出) → T8(院士级)',
  'T5': 'T6(首席研究员) → T7(杰出) → T8(院士级) → T9(权威)',
  'T6': 'T7(杰出) → T8(院士级) → T9(权威)',
  'T7': 'T8(院士级) → T9(权威)',
  'T8': 'T9(领域权威)',
  'T9': '领域最高荣誉 / 首席科学家',
};

// ── 职位晋升路径特殊映射 ──
const positionPromotionNotes = {
  '软件工程师': '高级工程师 → 技术专家/架构师 → 技术总监/首席架构师',
  '前端工程师': '高级前端 → 前端架构师 → 大前端负责人',
  '后端工程师': '高级后端 → 后端架构师 → 技术总监',
  '全栈工程师': '高级全栈 → 架构师 → 技术总监',
  '算法工程师': '高级算法 → 算法专家 → 首席科学家',
  '数据工程师': '高级数据工程师 → 数据架构师 → 数据平台负责人',
  'DevOps工程师': '高级DevOps → DevOps架构师 → 平台工程总监',
  '产品经理': '高级PM → 产品总监 → CPO',
  '项目经理': '高级项目经理 → PMO总监 → 项目管理VP',
  '技术总监': 'CTO / 技术VP方向',
  '架构师': '首席架构师 → CTO',
  '数据分析师': '高级数据分析师 → 数据科学家 → 数据总监',
  '商业分析师': '高级商业分析师 → 战略总监 → CSO',
  'UI/UX设计师': '高级设计师 → 设计主管 → 设计总监',
  '人力资源': 'HR主管 → HR经理 → HRD → CHRO',
  '财务': '财务主管 → 财务经理 → 财务总监 → CFO',
  '行政': '行政主管 → 行政经理 → 行政总监',
  '法务': '法务主管 → 法务经理 → 法务总监 → GC',
  '销售经理': '高级销售经理 → 销售总监 → CRO',
  '市场经理': '高级市场经理 → 市场总监 → CMO',
  '运营经理': '高级运营经理 → 运营总监 → COO',
};

// ── 哈希种子函数 ──
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 基于种子生成 [0, 1) 的伪随机数
 */
function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * 生成指定岗位、企业性质、职级的薪酬数据
 * @param {string} position - 岗位名称
 * @param {string} company - 企业性质
 * @param {string} rank - 职级
 * @returns {object} 完整薪酬数据
 */
export function generateSalaryData(position, company, rank) {
  const baseSalary = positionBaseSalary[position] || 18000;
  const cMult = companyMultiplier[company] || 1.0;
  const rInfo = rankMultiplier[rank] || { mult: 1.0, label: rank, category: 'tech' };

  // 核心月薪中位数
  const midMonthly = Math.round(baseSalary * cMult * rInfo.mult / 100) * 100;

  // 使用确定性种子生成分位数偏移
  const seed = hashCode(`${position}-${company}-${rank}`);
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);

  // 月薪分位数 (基于中位数 ± 合理范围)
  const spread = 0.18 + r1 * 0.14; // 波动系数 18%-32%
  const p10 = Math.round(midMonthly * (1 - spread * 1.4) / 100) * 100;
  const p25 = Math.round(midMonthly * (1 - spread * 0.7) / 100) * 100;
  const p50 = midMonthly;
  const p75 = Math.round(midMonthly * (1 + spread * 0.7) / 100) * 100;
  const p90 = Math.round(midMonthly * (1 + spread * 1.5) / 100) * 100;

  // 年终奖月数
  const bonusCfg = bonusMonthsBase[company] || { min: 1, mid: 2, max: 4 };
  const bonusMonths = {
    p10: bonusCfg.min,
    p25: Math.round((bonusCfg.min + bonusCfg.mid) / 2 * 10) / 10,
    p50: bonusCfg.mid,
    p75: Math.round((bonusCfg.mid + bonusCfg.max) / 2 * 10) / 10,
    p90: bonusCfg.max,
  };

  // 年薪 = 月薪 × (12 + 年终奖月数)
  const calcAnnual = (monthly, bonus) => Math.round(monthly * (12 + bonus) / 100) * 100;
  const annual = {
    p10: calcAnnual(p10, bonusMonths.p10),
    p25: calcAnnual(p25, bonusMonths.p25),
    p50: calcAnnual(p50, bonusMonths.p50),
    p75: calcAnnual(p75, bonusMonths.p75),
    p90: calcAnnual(p90, bonusMonths.p90),
  };

  // 股权/期权价值(年)
  const equityCfg = equityRatioBase[company] || { p50: 0, p90: 0 };
  const equity = {
    p10: 0,
    p25: Math.round(annual.p25 * equityCfg.p50 * 0.3 / 1000) * 1000,
    p50: Math.round(annual.p50 * equityCfg.p50 / 1000) * 1000,
    p75: Math.round(annual.p75 * (equityCfg.p50 + equityCfg.p90) / 2 / 1000) * 1000,
    p90: Math.round(annual.p90 * equityCfg.p90 / 1000) * 1000,
  };

  // 住房公积金 (个人+公司合并，月)
  const hfRate = housingFundRates[company] || { personal: 0.07, company: 0.07 };
  const housingFund = {
    p10: Math.round(p10 * (hfRate.personal + hfRate.company) / 100) * 100,
    p25: Math.round(p25 * (hfRate.personal + hfRate.company) / 100) * 100,
    p50: Math.round(p50 * (hfRate.personal + hfRate.company) / 100) * 100,
    p75: Math.round(p75 * (hfRate.personal + hfRate.company) / 100) * 100,
    p90: Math.round(p90 * (hfRate.personal + hfRate.company) / 100) * 100,
  };

  // 时薪估算 (按每月21.75天，每天8小时)
  const hourlyRate = {
    p10: Math.round(p10 / (21.75 * 8) * 100) / 100,
    p25: Math.round(p25 / (21.75 * 8) * 100) / 100,
    p50: Math.round(p50 / (21.75 * 8) * 100) / 100,
    p75: Math.round(p75 / (21.75 * 8) * 100) / 100,
    p90: Math.round(p90 / (21.75 * 8) * 100) / 100,
  };

  return {
    position,
    company,
    rank,
    rankLabel: rInfo.label,
    rankCategory: rInfo.category,
    baseSalary,
    // 月薪分位数
    monthly: { p10, p25, p50, p75, p90 },
    // 年薪分位数
    annual,
    // 年终奖月数
    bonusMonths,
    // 股权期权价值
    equity,
    // 住房公积金
    housingFund,
    // 时薪
    hourlyRate,
  };
}

/**
 * 获取薪酬结构占比
 */
export function getSalaryStructure(company) {
  return salaryStructureBase[company] || salaryStructureBase['民营企业'];
}

/**
 * 获取市场均值的百分比差异
 * 返回该薪酬相对于市场均值的百分比
 */
export function getMarketComparison(position, company, rank) {
  const data = generateSalaryData(position, company, rank);
  // 计算"市场均值"：对所有企业性质取中位数
  const allCompanies = Object.keys(companyMultiplier);
  let totalMid = 0;
  allCompanies.forEach((c) => {
    const d = generateSalaryData(position, c, rank);
    totalMid += d.monthly.p50;
  });
  const marketAvg = totalMid / allCompanies.length;
  const diffPct = Math.round(((data.monthly.p50 - marketAvg) / marketAvg) * 100);
  return {
    marketAvgMonthly: Math.round(marketAvg / 100) * 100,
    currentMonthly: data.monthly.p50,
    diffPct,
  };
}

/**
 * 获取增长预测
 */
export function getGrowthPrediction(position, company, rank) {
  const data = generateSalaryData(position, company, rank);
  const rates = growthRates[company] || { y1: 0.10, y3: 0.30, y5: 0.60 };
  const currentAnnual = data.annual.p50;

  const predictions = {
    current: currentAnnual,
    y1: Math.round(currentAnnual * (1 + rates.y1) / 1000) * 1000,
    y3: Math.round(currentAnnual * (1 + rates.y3) / 1000) * 1000,
    y5: Math.round(currentAnnual * (1 + rates.y5) / 1000) * 1000,
    rates,
  };

  const promotionPathP = promotionPaths[rank] || '晋升路径请参考公司职级体系';
  const promotionNote = positionPromotionNotes[position] || '';

  return {
    ...predictions,
    promotionPath: promotionPathP,
    promotionNote,
  };
}

/**
 * 获取同一岗位在不同企业性质中的薪酬排名
 */
export function getMarketRanking(position, rank) {
  const allCompanies = Object.keys(companyMultiplier);
  const rankings = allCompanies.map((c) => {
    const d = generateSalaryData(position, c, rank);
    return { company: c, monthly: d.monthly.p50, annual: d.annual.p50 };
  });
  rankings.sort((a, b) => b.monthly - a.monthly);
  return rankings;
}

// ── 导出常量供表单使用 ──
export const POSITIONS = Object.keys(positionBaseSalary);
export const COMPANIES = Object.keys(companyMultiplier);
export const RANKS = Object.keys(rankMultiplier).map((key) => ({
  value: key,
  label: rankMultiplier[key].label,
  category: rankMultiplier[key].category,
}));

export const RANK_GROUPS = {
  tech: { label: '技术序列 (P1-P9)', ranks: Object.keys(rankMultiplier).filter((k) => rankMultiplier[k].category === 'tech') },
  mgmt: { label: '管理序列 (M1-M5)', ranks: Object.keys(rankMultiplier).filter((k) => rankMultiplier[k].category === 'mgmt') },
};

// ── 学历选项 ──
export const EDUCATION_LEVELS = [
  '高中/中专',
  '大专',
  '本科',
  '硕士',
  '博士',
  'MBA',
];

// ── 城市分层选项 ──
export const CITIES = [
  '一线城市',
  '二线城市',
  '三四线城市',
];
