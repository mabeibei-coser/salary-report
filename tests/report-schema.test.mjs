import assert from "node:assert/strict";
import test from "node:test";

import { hasCompletePositionProfile, hasRequiredReportShape } from "../lib/report-schema.js";

function makePositionProfile() {
  return {
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
      years: [2024, 2025, 2026].map((year) => ({
        year,
        demand: "需求稳定",
        profileShift: `${year} 年人选变化`,
      })),
      interpretation: "三年趋势综合解读",
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

test("人选趋势必须覆盖 2024 至 2026 三年", () => {
  const report = makeReport();
  report.positionProfile.candidateTrend.years[1].year = 2023;
  assert.equal(hasRequiredReportShape(report), false);
});

test("岗位无效的短路响应仍然合法", () => {
  assert.equal(hasRequiredReportShape({ invalid: true }), true);
});
