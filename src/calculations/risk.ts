/**
 * Risk Assessment - Course failure risk evaluation
 *
 * Thresholds:
 * - Failing: Grade < 60%
 * - At Risk: Grade < 70%
 * - Borderline: Grade < 75% OR missing could drop below 70%
 * - Safe: Grade ≥ 75% with low risk
 */

import type { SimpleAssignment, SimpleCourse } from "../api/mod.ts";

export type RiskLevel = "failing" | "at_risk" | "borderline" | "safe";

export interface CourseRisk {
  courseId: number;
  courseName: string;
  currentGrade: number | null;
  letterGrade: string | null;
  riskLevel: RiskLevel;
  reason: string;
  missingCount: number;
  missingPoints: number;
}

export interface RiskAssessment {
  summary: {
    failing: number;
    atRisk: number;
    borderline: number;
    safe: number;
    unknown: number;
  };
  courses: CourseRisk[];
  criticalCourses: CourseRisk[];
}

/**
 * Assess risk for all courses
 *
 * @param courses - Courses with current grades
 * @param missing - Missing assignments
 */
export function assessRisk(
  courses: SimpleCourse[],
  missing: SimpleAssignment[]
): RiskAssessment {
  // Count missing by course
  const missingByCourse = new Map<number, { count: number; points: number }>();
  for (const item of missing) {
    const existing = missingByCourse.get(item.courseId) || { count: 0, points: 0 };
    existing.count++;
    existing.points += item.pointsPossible ?? 0;
    missingByCourse.set(item.courseId, existing);
  }

  const courseRisks: CourseRisk[] = [];
  const summary = {
    failing: 0,
    atRisk: 0,
    borderline: 0,
    safe: 0,
    unknown: 0,
  };

  for (const course of courses) {
    const missingData = missingByCourse.get(course.id) || { count: 0, points: 0 };
    const risk = assessCourseRisk(course, missingData.count, missingData.points);
    courseRisks.push(risk);

    // Update summary
    switch (risk.riskLevel) {
      case "failing":
        summary.failing++;
        break;
      case "at_risk":
        summary.atRisk++;
        break;
      case "borderline":
        summary.borderline++;
        break;
      case "safe":
        summary.safe++;
        break;
    }

    if (risk.currentGrade === null) {
      summary.unknown++;
    }
  }

  // Sort by risk level (failing first) then by grade
  courseRisks.sort((a, b) => {
    const riskOrder: Record<RiskLevel, number> = {
      failing: 0,
      at_risk: 1,
      borderline: 2,
      safe: 3,
    };
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;

    // Within same risk level, sort by grade ascending (worse first)
    const gradeA = a.currentGrade ?? 100;
    const gradeB = b.currentGrade ?? 100;
    return gradeA - gradeB;
  });

  // Critical courses are failing or at_risk
  const criticalCourses = courseRisks.filter(
    (c) => c.riskLevel === "failing" || c.riskLevel === "at_risk"
  );

  return {
    summary,
    courses: courseRisks,
    criticalCourses,
  };
}

/**
 * Assess risk for a single course
 */
function assessCourseRisk(
  course: SimpleCourse,
  missingCount: number,
  missingPoints: number
): CourseRisk {
  const grade = course.score;
  const letterGrade = course.grade;

  // No grade data
  if (grade === null) {
    return {
      courseId: course.id,
      courseName: course.name,
      currentGrade: null,
      letterGrade,
      riskLevel: missingCount > 0 ? "at_risk" : "safe",
      reason: missingCount > 0 ? `${missingCount} missing assignments, no grade data` : "No grade data",
      missingCount,
      missingPoints,
    };
  }

  // Determine risk level
  let riskLevel: RiskLevel;
  let reason: string;

  if (grade < 60) {
    riskLevel = "failing";
    reason = `Grade is ${grade.toFixed(1)}% (failing)`;
  } else if (grade < 70) {
    riskLevel = "at_risk";
    reason = `Grade is ${grade.toFixed(1)}% (below passing)`;
  } else if (grade < 75) {
    riskLevel = "borderline";
    reason = `Grade is ${grade.toFixed(1)}% (close to at-risk threshold)`;
  } else {
    riskLevel = "safe";
    reason = `Grade is ${grade.toFixed(1)}%`;
  }

  // Check if missing assignments could drop grade below thresholds
  if (riskLevel === "safe" && missingCount > 0) {
    // Rough estimate: if missing points are significant, could be at risk
    // This is a simplified heuristic - real impact depends on total course points
    if (missingPoints >= 50 || missingCount >= 3) {
      riskLevel = "borderline";
      reason = `${missingCount} missing assignments (${missingPoints} pts) could impact grade`;
    } else {
      reason += ` - ${missingCount} missing assignment(s)`;
    }
  }

  return {
    courseId: course.id,
    courseName: course.name,
    currentGrade: grade,
    letterGrade,
    riskLevel,
    reason,
    missingCount,
    missingPoints,
  };
}

/**
 * Get a simple yes/no answer: is the student at risk of failing any class?
 */
export function isAtRiskOfFailing(courses: SimpleCourse[], missing: SimpleAssignment[]): boolean {
  const assessment = assessRisk(courses, missing);
  return assessment.summary.failing > 0 || assessment.summary.atRisk > 0;
}

/**
 * Get courses that need immediate attention
 */
export function getCoursesNeedingAttention(
  courses: SimpleCourse[],
  missing: SimpleAssignment[]
): CourseRisk[] {
  const assessment = assessRisk(courses, missing);
  return assessment.courses.filter(
    (c) => c.riskLevel !== "safe"
  );
}
