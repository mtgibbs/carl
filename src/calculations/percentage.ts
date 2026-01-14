/**
 * Percentage Calculations - Missing work percentages
 *
 * Calculates what percentage of assignments are missing overall and by course
 */

import type { SimpleAssignment, SimpleCourse, SimpleTodoItem } from "../api/mod.ts";

export interface MissingPercentageResult {
  overall: {
    total: number;
    missing: number;
    percentage: number;
  };
  byCourse: CoursePercentage[];
}

export interface CoursePercentage {
  courseId: number;
  courseName: string;
  total: number;
  missing: number;
  percentage: number;
}

/**
 * Calculate missing assignment percentages
 *
 * @param dueSoonItems - All assignments due within a time period (total count)
 * @param missingItems - Assignments flagged as missing
 * @param courses - Optional: limit to specific courses
 */
export function calculateMissingPercentages(
  dueSoonItems: SimpleTodoItem[],
  missingItems: SimpleAssignment[],
  courses?: SimpleCourse[]
): MissingPercentageResult {
  // Filter to only courses we care about if specified
  const courseIds = courses ? new Set(courses.map((c) => c.id)) : null;

  const filteredDue = courseIds
    ? dueSoonItems.filter((item) => item.courseId && courseIds.has(item.courseId))
    : dueSoonItems;

  const filteredMissing = courseIds
    ? missingItems.filter((item) => courseIds.has(item.courseId))
    : missingItems;

  // Overall calculation
  const totalAssignments = filteredDue.length;
  const totalMissing = filteredMissing.length;
  const overallPercentage =
    totalAssignments > 0 ? Math.round((totalMissing / totalAssignments) * 100) : 0;

  // By course calculation
  const courseMap = new Map<number, { name: string; total: number; missing: number }>();

  // Count total assignments per course
  for (const item of filteredDue) {
    if (!item.courseId) continue;
    const existing = courseMap.get(item.courseId);
    if (existing) {
      existing.total++;
    } else {
      courseMap.set(item.courseId, {
        name: item.courseName,
        total: 1,
        missing: 0,
      });
    }
  }

  // Count missing per course
  for (const item of filteredMissing) {
    const existing = courseMap.get(item.courseId);
    if (existing) {
      existing.missing++;
    } else {
      courseMap.set(item.courseId, {
        name: item.courseName,
        total: 0, // We don't know total if it wasn't in dueSoon
        missing: 1,
      });
    }
  }

  // Convert to array with percentages
  const byCourse: CoursePercentage[] = [];
  for (const [courseId, data] of courseMap) {
    // Only include courses with meaningful data
    if (data.total === 0 && data.missing === 0) continue;

    byCourse.push({
      courseId,
      courseName: data.name,
      total: data.total,
      missing: data.missing,
      percentage: data.total > 0 ? Math.round((data.missing / data.total) * 100) : 100,
    });
  }

  // Sort by percentage descending (worst first)
  byCourse.sort((a, b) => b.percentage - a.percentage);

  return {
    overall: {
      total: totalAssignments,
      missing: totalMissing,
      percentage: overallPercentage,
    },
    byCourse,
  };
}

/**
 * Simple percentage calculation from just missing count and total
 */
export function calculateSimplePercentage(missing: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((missing / total) * 100);
}
