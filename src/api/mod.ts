/**
 * C.A.R.L. Canvas API Module
 *
 * This is the main facade that provides simplified functions for CARL's use cases.
 * It wraps the underlying Canvas API modules with a streamlined interface.
 */

import { loadConfig, getConfig } from "./config.ts";
import { initClient } from "./client.ts";
import { listCoursesWithGrades, listCourses } from "./courses.ts";
import { listUnsubmittedPastDueForCourses } from "./assignments.ts";
import { getMissingSubmissions, getPlannerItems } from "./users.ts";
import { listUserSubmissions } from "./submissions.ts";

// Re-export types that CARL needs
export type { Course, Assignment, Enrollment, PlannerItem, MissingSubmission } from "./types.ts";
export type { Config } from "./config.ts";

// Re-export lower-level functions for advanced use
export * from "./courses.ts";
export * from "./assignments.ts";
export * from "./users.ts";
export * from "./submissions.ts";
export * from "./enrollments.ts";
export { loadConfig, getConfig } from "./config.ts";
export { initClient, getClient } from "./client.ts";

/**
 * Initialize the Canvas API client
 * Must be called before using any API functions
 */
export async function initCanvasApi(): Promise<void> {
  const config = await loadConfig();
  initClient({
    baseUrl: config.baseUrl,
    apiToken: config.apiToken,
  });
}

// ============================================================================
// Simplified facade functions for CARL's common use cases
// ============================================================================

/** Simplified course with grade info for CARL */
export interface SimpleCourse {
  id: number;
  name: string;
  code: string;
  grade: string | null;
  score: number | null;
}

/**
 * Get all courses with current grades
 * This is what CARL uses for "what are my grades?" queries
 */
export async function getCoursesWithGrades(): Promise<SimpleCourse[]> {
  const config = getConfig();
  const courses = await listCoursesWithGrades(config.studentId);

  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.course_code,
    grade: course.enrollment?.grades?.current_grade || null,
    score: course.enrollment?.grades?.current_score || null,
  }));
}

/** Simplified assignment for CARL */
export interface SimpleAssignment {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
  dueAt: Date | null;
  pointsPossible: number | null;
  submitted: boolean;
  missing: boolean;
  url: string;
}

/**
 * Get missing assignments (Canvas-flagged)
 * This is what CARL uses for "what's missing?" queries
 */
export async function getMissingAssignments(): Promise<SimpleAssignment[]> {
  const config = getConfig();
  const missing = await getMissingSubmissions({
    studentId: config.studentId,
    include: ["course"],
  });

  return missing.map((item) => ({
    id: item.id,
    name: item.name,
    courseName: item.course?.name || `Course ${item.course_id}`,
    courseId: item.course_id,
    dueAt: item.due_at ? new Date(item.due_at) : null,
    pointsPossible: item.points_possible,
    submitted: false,
    missing: true,
    url: item.html_url,
  }));
}

/**
 * Get unsubmitted past-due assignments
 * This catches items Canvas hasn't flagged as "missing" yet
 */
export async function getUnsubmittedPastDue(): Promise<SimpleAssignment[]> {
  const config = getConfig();

  // Get all active courses first
  const courses = await listCourses({
    enrollment_state: "active",
    state: ["available"],
  });

  const courseIds = courses.map((c) => c.id);
  const courseMap = new Map(courses.map((c) => [c.id, c.name]));

  const unsubmitted = await listUnsubmittedPastDueForCourses(courseIds);

  return unsubmitted.map((item) => ({
    id: item.id,
    name: item.name,
    courseName: courseMap.get(item.course_id) || `Course ${item.course_id}`,
    courseId: item.course_id,
    dueAt: item.due_at ? new Date(item.due_at) : null,
    pointsPossible: item.points_possible,
    submitted: false,
    missing: true,
    url: item.html_url,
  }));
}

/** Simplified todo item for CARL */
export interface SimpleTodoItem {
  id: number;
  title: string;
  courseName: string;
  courseId: number | undefined;
  dueAt: Date | null;
  pointsPossible: number | null;
  submitted: boolean;
  graded: boolean;
  missing: boolean;
  type: string;
  url: string;
}

/**
 * Get todo/planner items due in the next N days
 * This is what CARL uses for "what's due this week?" queries
 */
export async function getDueThisWeek(days: number = 7): Promise<SimpleTodoItem[]> {
  const config = getConfig();

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + days);

  const items = await getPlannerItems({
    studentId: config.studentId,
    startDate: now.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  });

  return items
    .filter((item) => item.plannable_type === "assignment" || item.plannable_type === "quiz")
    .map((item) => ({
      id: item.plannable_id,
      title: item.plannable.title,
      courseName: item.context_name,
      courseId: item.course_id,
      dueAt: item.plannable.due_at ? new Date(item.plannable.due_at) : null,
      pointsPossible: item.plannable.points_possible,
      submitted: item.submissions?.submitted || false,
      graded: item.submissions?.graded || false,
      missing: item.submissions?.missing || false,
      type: item.plannable_type,
      url: item.html_url,
    }))
    .sort((a, b) => {
      if (!a.dueAt || !b.dueAt) return 0;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });
}

/**
 * Get todo items (wrapper for backwards compatibility)
 */
export async function getTodoItemsSimple(days: number = 7): Promise<SimpleTodoItem[]> {
  return getDueThisWeek(days);
}

/** Simplified submission with grade info for CARL */
export interface SimpleGradedAssignment {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
  dueAt: Date | null;
  pointsPossible: number | null;
  score: number | null;
  grade: string | null;
  percentage: number | null;
  url: string;
}

/**
 * Get assignments with zero or very low grades (< threshold%)
 * These are past-due assignments that got graded but scored poorly
 */
export async function getZeroGradeAssignments(threshold: number = 10): Promise<SimpleGradedAssignment[]> {
  const config = getConfig();

  // Get all active courses
  const courses = await listCourses({
    enrollment_state: "active",
    state: ["available"],
  });

  const results: SimpleGradedAssignment[] = [];
  const now = new Date();

  // Check each course for low-grade submissions
  for (const course of courses) {
    try {
      const submissions = await listUserSubmissions(course.id, config.studentId, {
        include: ["assignment"],
      });

      for (const sub of submissions) {
        const assignment = sub.assignment;
        if (!assignment) continue;

        // Must have a due date in the past
        if (!assignment.due_at) continue;
        const dueDate = new Date(assignment.due_at);
        if (dueDate >= now) continue;

        // Must have been graded with a score
        if (sub.score === null || sub.score === undefined) continue;
        if (!assignment.points_possible) continue;

        // Calculate percentage
        const percentage = (sub.score / assignment.points_possible) * 100;

        // Include if below threshold (default 10% catches zeros and near-zeros)
        if (percentage < threshold) {
          results.push({
            id: assignment.id,
            name: assignment.name,
            courseName: course.name,
            courseId: course.id,
            dueAt: dueDate,
            pointsPossible: assignment.points_possible,
            score: sub.score,
            grade: sub.grade || null,
            percentage: Math.round(percentage * 10) / 10,
            url: assignment.html_url,
          });
        }
      }
    } catch (error) {
      // Skip courses we can't access
      console.error(`Error fetching submissions for course ${course.id}:`, error);
    }
  }

  // Sort by due date (most recent first)
  return results.sort((a, b) => {
    if (!a.dueAt || !b.dueAt) return 0;
    return b.dueAt.getTime() - a.dueAt.getTime();
  });
}
