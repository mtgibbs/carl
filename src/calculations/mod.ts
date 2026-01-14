/**
 * C.A.R.L. Calculations Module
 *
 * Deterministic calculations for complex queries:
 * - Course filtering (fuzzy matching)
 * - Missing percentages
 * - Assignment prioritization
 * - Risk assessment
 */

export {
  filterCourses,
  findBestMatch,
  extractCourseFilter,
} from "./courseFilter.ts";

export {
  calculateMissingPercentages,
  calculateSimplePercentage,
  type MissingPercentageResult,
  type CoursePercentage,
} from "./percentage.ts";

export {
  prioritizeAssignments,
  getTopPriority,
  type PrioritizedItem,
} from "./priority.ts";

export {
  assessRisk,
  isAtRiskOfFailing,
  getCoursesNeedingAttention,
  type RiskLevel,
  type CourseRisk,
  type RiskAssessment,
} from "./risk.ts";
