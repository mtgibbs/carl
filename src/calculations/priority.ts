/**
 * Priority Scoring - Determines what to work on first
 *
 * Algorithm:
 * totalScore = (urgencyScore × 0.6) + (impactScore × 0.4)
 *
 * urgencyScore:
 * - Missing: 50 + (days_past_due × 5), max 100
 * - Due ≤1 day: 80
 * - Due ≤3 days: 60
 * - Due ≤7 days: 40
 * - Later: 20
 *
 * impactScore:
 * - Based on points_possible
 * - 1.5x multiplier if course grade < 70%
 */

import type { SimpleAssignment, SimpleCourse, SimpleTodoItem } from "../api/mod.ts";

export interface PrioritizedItem {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
  dueAt: Date | null;
  pointsPossible: number | null;
  url: string;
  score: number;
  urgencyScore: number;
  impactScore: number;
  reason: string;
  status: "missing" | "due_soon" | "upcoming";
}

interface GradeMap {
  [courseId: number]: number | null;
}

/**
 * Score and prioritize assignments
 *
 * @param missing - Missing assignments (highest priority)
 * @param dueSoon - Upcoming assignments
 * @param courses - Course grades for impact scoring
 */
export function prioritizeAssignments(
  missing: SimpleAssignment[],
  dueSoon: SimpleTodoItem[],
  courses: SimpleCourse[]
): PrioritizedItem[] {
  const now = new Date();
  const items: PrioritizedItem[] = [];

  // Build grade lookup
  const gradeMap: GradeMap = {};
  for (const course of courses) {
    gradeMap[course.id] = course.score;
  }

  // Score missing assignments
  for (const assignment of missing) {
    const urgency = calculateUrgencyScore(assignment.dueAt, now, true);
    const impact = calculateImpactScore(
      assignment.pointsPossible,
      gradeMap[assignment.courseId]
    );
    const total = urgency * 0.6 + impact * 0.4;

    items.push({
      id: assignment.id,
      name: assignment.name,
      courseName: assignment.courseName,
      courseId: assignment.courseId,
      dueAt: assignment.dueAt,
      pointsPossible: assignment.pointsPossible,
      url: assignment.url,
      score: Math.round(total),
      urgencyScore: Math.round(urgency),
      impactScore: Math.round(impact),
      reason: generateReason(assignment.dueAt, now, true, assignment.pointsPossible),
      status: "missing",
    });
  }

  // Score due soon items (exclude already-submitted)
  const missingIds = new Set(missing.map((m) => m.id));
  for (const item of dueSoon) {
    // Skip if already in missing or already submitted
    if (missingIds.has(item.id) || item.submitted) continue;

    const urgency = calculateUrgencyScore(item.dueAt, now, false);
    const courseId = item.courseId ?? 0;
    const impact = calculateImpactScore(item.pointsPossible, gradeMap[courseId]);
    const total = urgency * 0.6 + impact * 0.4;

    items.push({
      id: item.id,
      name: item.title,
      courseName: item.courseName,
      courseId: courseId,
      dueAt: item.dueAt,
      pointsPossible: item.pointsPossible,
      url: item.url,
      score: Math.round(total),
      urgencyScore: Math.round(urgency),
      impactScore: Math.round(impact),
      reason: generateReason(item.dueAt, now, false, item.pointsPossible),
      status: urgency >= 60 ? "due_soon" : "upcoming",
    });
  }

  // Sort by score descending
  items.sort((a, b) => b.score - a.score);

  return items;
}

/**
 * Calculate urgency score based on due date
 */
function calculateUrgencyScore(dueAt: Date | null, now: Date, isMissing: boolean): number {
  if (!dueAt) {
    // No due date = low urgency
    return 10;
  }

  const diffMs = dueAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (isMissing || diffDays < 0) {
    // Past due: 50 + (days_past × 5), max 100
    const daysPast = Math.abs(diffDays);
    return Math.min(100, 50 + daysPast * 5);
  }

  if (diffDays <= 1) return 80; // Due within 1 day
  if (diffDays <= 3) return 60; // Due within 3 days
  if (diffDays <= 7) return 40; // Due within 1 week
  return 20; // Due later
}

/**
 * Calculate impact score based on points and course grade
 */
function calculateImpactScore(
  pointsPossible: number | null,
  courseGrade: number | null
): number {
  // Base score from points
  let baseScore = 50; // Default for unknown points

  if (pointsPossible !== null) {
    if (pointsPossible >= 100) baseScore = 100;
    else if (pointsPossible >= 50) baseScore = 80;
    else if (pointsPossible >= 25) baseScore = 60;
    else if (pointsPossible >= 10) baseScore = 40;
    else baseScore = 20;
  }

  // Multiplier if course grade is low
  if (courseGrade !== null && courseGrade < 70) {
    baseScore = Math.min(100, baseScore * 1.5);
  }

  return baseScore;
}

/**
 * Generate human-readable reason for priority
 */
function generateReason(
  dueAt: Date | null,
  now: Date,
  isMissing: boolean,
  points: number | null
): string {
  const parts: string[] = [];

  if (isMissing) {
    parts.push("Missing");
    if (dueAt) {
      const daysPast = Math.ceil((now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast > 1) {
        parts[0] = `Missing (${daysPast} days overdue)`;
      }
    }
  } else if (dueAt) {
    const diffMs = dueAt.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) parts.push("Due very soon");
    else if (diffDays <= 3) parts.push("Due in next 3 days");
    else parts.push("Upcoming");
  }

  if (points !== null && points >= 50) {
    parts.push(`High value (${points} pts)`);
  }

  return parts.join(" · ") || "Normal priority";
}

/**
 * Get top N priority items
 */
export function getTopPriority(
  missing: SimpleAssignment[],
  dueSoon: SimpleTodoItem[],
  courses: SimpleCourse[],
  limit: number = 5
): PrioritizedItem[] {
  const all = prioritizeAssignments(missing, dueSoon, courses);
  return all.slice(0, limit);
}
