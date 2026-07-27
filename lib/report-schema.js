const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const hasStringFields = (value, fields) =>
  value && typeof value === "object" && fields.every((field) => isNonEmptyString(value[field]));

export function hasCompletePositionProfile(report) {
  const profile = report?.positionProfile;
  if (!profile || typeof profile !== "object") return false;

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
  const yearsValid =
    trend &&
    Array.isArray(trend.years) &&
    trend.years.length === 3 &&
    trend.years.every(
      (item, index) =>
        item?.year === 2024 + index && hasStringFields(item, ["demand", "profileShift"]),
    );

  return Boolean(
    responsibilitiesValid &&
    competenciesValid &&
    kpisValid &&
    okrsValid &&
    achievementsValid &&
    yearsValid &&
    isNonEmptyString(trend?.interpretation)
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
