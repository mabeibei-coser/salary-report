import assert from "node:assert/strict";
import test from "node:test";

import { hasCompletePositionProfile, hasRequiredReportShape } from "../lib/report-schema.js";

function makePositionProfile() {
  return {
    jobPerspective: {
      distinctivePosition: "鲜明定位：该岗位的核心价值在于把业务目标转成可验证结果",
      uniqueInsight: "独到判断：真正稀缺的不是单项技能，而是跨场景闭环能力",
      futureOutlook: "创新前瞻：未来两年将从执行角色升级为智能化业务伙伴",
    },
    coreResponsibilities: Array.from({ length: 5 }, (_, i) => `核心职责 ${i + 1}`),
    coreCompetencies: Array.from({ length: 5 }, (_, i) => ({
      name: `核心能力 ${i + 1}`,
      description: `能力说明 ${i + 1}`,
    })),
    coreKpis: Array.from({ length: 5 }, (_, i) => ({
      name: `核心 KPI ${i + 1}`,
      metric: `衡量口径 ${i + 1}`,
      target: `建议目标 ${i + 1}`,
    })),
    okrDesign: Array.from({ length: 2 }, (_, i) => ({
      objective: `目标 ${i + 1}`,
      keyResults: Array.from({ length: 3 }, (_, j) => `关键结果 ${i + 1}-${j + 1}`),
    })),
    innovationAchievements: Array.from({ length: 4 }, (_, i) => ({
      title: `创新方向 ${i + 1}`,
      evidence: `业绩证据 ${i + 1}`,
    })),
    candidateTrend: {
      trends: ["数量与层次", "技能与证据", "来源与流动"].map((category, i) => ({
        category,
        title: `供给趋势 ${i + 1}`,
        supplyAnalysis: `近三年该岗位人才供给结构变化 ${i + 1}`,
      })),
    },
  };
}

function makeReport() {
  return {
    rankLadder: Array(14).fill({}),
    salaryTrend: Array(5).fill({}),
    industryAnalysis: Array(25).fill({}),
    cityAnalysis: Array(6).fill({}),
    monthly: {},
    annual: {},
    bonusMonths: {},
    highEarnerTraits: "谈薪筹码",
    positionProfile: makePositionProfile(),
  };
}

test("完整岗位画像通过报告结构校验", () => {
  const report = makeReport();
  assert.equal(hasCompletePositionProfile(report), true);
  assert.equal(hasRequiredReportShape(report), true);
});

test("缺少任一岗位画像模块时拒绝报告，避免缓存或展示半成品", () => {
  for (const field of [
    "jobPerspective",
    "coreResponsibilities",
    "coreCompetencies",
    "coreKpis",
    "okrDesign",
    "innovationAchievements",
    "candidateTrend",
  ]) {
    const report = makeReport();
    delete report.positionProfile[field];
    assert.equal(hasRequiredReportShape(report), false, `应拒绝缺少 ${field} 的报告`);
  }
});

test("人选趋势必须是三点供给侧趋势", () => {
  const report = makeReport();
  report.positionProfile.candidateTrend.trends.pop();
  assert.equal(hasRequiredReportShape(report), false);
});

test("人选趋势拒绝按年份拆分的旧结构", () => {
  const report = makeReport();
  report.positionProfile.candidateTrend = {
    years: [2024, 2025, 2026].map((year) => ({ year, demand: "稳定", profileShift: "变化" })),
    interpretation: "逐年解读",
  };
  assert.equal(hasRequiredReportShape(report), false);
});

test("人选趋势拒绝需求侧和招聘偏好表述", () => {
  const report = makeReport();
  report.positionProfile.candidateTrend.trends[0].title = "复合人才需求激增";
  report.positionProfile.candidateTrend.trends[0].supplyAnalysis = "企业更倾向招聘复合型候选人";
  assert.equal(hasRequiredReportShape(report), false);
});

test("岗位无效的短路响应仍然合法", () => {
  assert.equal(hasRequiredReportShape({ invalid: true }), true);
});
