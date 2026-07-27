const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const hasStringFields = (value, fields) =>
  value && typeof value === "object" && fields.every((field) => isNonEmptyString(value[field]));

const SUPPLY_TREND_CATEGORIES = ["数量与层次", "技能与证据", "来源与流动"];
const DEMAND_SIDE_PATTERN = /需求|招聘|企业|用人|雇主|岗位空缺|职位空缺|更受青睐|用工缺口|偏好/;
const SUPPLY_SIDE_PATTERN = /供给|人选|候选人|人才|从业者|简历|流动|迁移|来源|存量|转入|转出|毕业生/;

export function hasCompletePositionProfile(report) {
  const profile = report?.positionProfile;
  if (!profile || typeof profile !== "object") return false;

  const perspectiveValid = hasStringFields(profile.jobPerspective, [
    "distinctivePosition",
    "uniqueInsight",
    "futureOutlook",
  ]);
  const responsibilitiesValid =
    Array.isArray(profile.coreResponsibilities) &&
    profile.coreResponsibilities.length === 5 &&
    profile.coreResponsibilities.every(isNonEmptyString);
  const competenciesValid =
    Array.isArray(profile.coreCompetencies) &&
    profile.coreCompetencies.length === 5 &&
    profile.coreCompetencies.every((item) => hasStringFields(item, ["name", "description"]));
  const kpisValid =
    Array.isArray(profile.coreKpis) &&
    profile.coreKpis.length === 5 &&
    profile.coreKpis.every((item) => hasStringFields(item, ["name", "metric", "target"]));
  const okrsValid =
    Array.isArray(profile.okrDesign) &&
    profile.okrDesign.length === 2 &&
    profile.okrDesign.every(
      (item) =>
        hasStringFields(item, ["objective"]) &&
        Array.isArray(item.keyResults) &&
        item.keyResults.length === 3 &&
        item.keyResults.every(isNonEmptyString),
    );
  const achievementsValid =
    Array.isArray(profile.innovationAchievements) &&
    profile.innovationAchievements.length === 4 &&
    profile.innovationAchievements.every((item) => hasStringFields(item, ["title", "evidence"]));

  const trend = profile.candidateTrend;
  const trendsValid =
    trend &&
    !Object.prototype.hasOwnProperty.call(trend, "years") &&
    Array.isArray(trend.trends) &&
    trend.trends.length === 3 &&
    trend.trends.every(
      (item, index) => {
        if (
          !hasStringFields(item, ["category", "title", "supplyAnalysis"]) ||
          item.category !== SUPPLY_TREND_CATEGORIES[index] ||
          Object.prototype.hasOwnProperty.call(item, "year")
        ) {
          return false;
        }
        const trendText = `${item.title} ${item.supplyAnalysis}`;
        return !DEMAND_SIDE_PATTERN.test(trendText) && SUPPLY_SIDE_PATTERN.test(item.supplyAnalysis);
      },
    );

  return Boolean(
    perspectiveValid &&
    responsibilitiesValid &&
    competenciesValid &&
    kpisValid &&
    okrsValid &&
    achievementsValid &&
    trendsValid
  );
}

export function hasRequiredReportShape(report) {
  if (report?.invalid === true) return true;
  const counts = [
    ["rankLadder", 14],
    ["salaryTrend", 5],
    ["industryAnalysis", 25],
    ["cityAnalysis", 6],
  ];
  const arraysValid = counts.every(
    ([field, expected]) => Array.isArray(report?.[field]) && report[field].length === expected,
  );
  const objectsValid = ["monthly", "annual", "bonusMonths"].every(
    (field) => report?.[field] && typeof report[field] === "object",
  );

  return (
    arraysValid &&
    objectsValid &&
    typeof report?.highEarnerTraits === "string" &&
    hasCompletePositionProfile(report)
  );
}
