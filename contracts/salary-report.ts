/**
 * salary-report 报告数据契约。
 *
 * 这份文件是「salary-report 项目对外发布的报告 JSON 字段定义」。
 * 任何想读 salary-report 数据库 reports.report_json 的下游
 * 项目（如 admin-hub），都直接以此为准。
 *
 * 上游约束：
 * - server.js 的 validateAndNormalize() 是这份契约的运行时实现，
 *   两边必须严格对齐
 * - 改 / 删任何字段（包括重命名）= 破坏契约，必须：
 *   1. 同步更新 server.js
 *   2. 通知所有下游消费者（目前只有 admin-hub）
 *   3. 下游运行 sync 命令拉取新版（admin-hub: `npm run sync-salary`）
 * - 加字段（向后兼容）= 不破坏契约，下游下次 sync 时自动拿到
 *
 * 来源真相：server.js validateAndNormalize()
 */

export type RankCategory = "tech" | "mgmt";

export interface Percentile {
  p25: number;
  p50: number;
  p75: number;
}

export interface MarketComparison {
  marketAvgMonthly: number;
  diffPct: number;
}

export interface SalaryTrendPoint {
  year: number;
  monthly: number;
}

export interface IndustryAnalysisItem {
  industry: string;
  description: string;
  monthlyRange: string;
  annualRange: string;
  demandLevel: string;
  salaryIncrease: string;
}

export interface CityAnalysisItem {
  city: string;
  monthlyAvg: number;
  costIndex: number;
  salaryLevel: string;
  advantage: string;
}

export interface SalaryReportData {
  position: string;
  company: string;
  rank: string;
  rankLabel: string;
  rankCategory: RankCategory;
  education: string;
  city: string;
  monthly: Percentile;
  annual: Percentile;
  bonusMonths: Percentile;
  equity: Percentile;
  housingFund: Percentile;
  hourlyRate: Percentile;
  marketComparison: MarketComparison;
  salaryTrend: SalaryTrendPoint[];
  industryAnalysis: IndustryAnalysisItem[];
  cityAnalysis: CityAnalysisItem[];
  highEarnerTraits: string;
}

/** salary-report 数据库 reports 表的直接列（非 report_json 内字段） */
export interface SalaryReportMeta {
  id: number;
  user_id: number;
  user_phone: string;
  created_at: number;
  position: string;
  company: string;
  rank: string;
  rank_label: string | null;
  education: string;
  city: string;
  duration_ms: number | null;
  ip: string | null;
  user_agent: string | null;
}
