/**
 * Canvas Assignments API
 */

import { getClient } from "./client.ts";
import type { Assignment, ListAssignmentsOptions } from "./types.ts";

/**
 * List assignments for a course
 */
export async function listAssignments(options: ListAssignmentsOptions): Promise<Assignment[]> {
  const client = getClient();
  const { course_id, ...rest } = options;

  const params: Record<string, string | string[] | undefined> = {};

  if (rest.bucket) {
    params.bucket = rest.bucket;
  }
  if (rest.order_by) {
    params.order_by = rest.order_by;
  }
  if (rest.include) {
    params.include = rest.include;
  }
  if (rest.search_term) {
    params.search_term = rest.search_term;
  }

  return client.getAll<Assignment>(`/courses/${course_id}/assignments`, params);
}

/**
 * Get a single assignment by ID
 */
export async function getAssignment(
  courseId: number,
  assignmentId: number,
  include?: Array<"submission" | "assignment_visibility" | "all_dates" | "overrides">
): Promise<Assignment> {
  const client = getClient();

  const params: Record<string, string[] | undefined> = {};
  if (include) {
    params.include = include;
  }

  return client.get<Assignment>(`/courses/${courseId}/assignments/${assignmentId}`, params);
}

/**
 * List assignments due within a date range
 */
export async function listAssignmentsDueInRange(
  courseId: number,
  startDate: Date,
  endDate: Date
): Promise<Assignment[]> {
  const assignments = await listAssignments({
    course_id: courseId,
    include: ["submission"],
    order_by: "due_at",
  });

  return assignments.filter((assignment) => {
    if (!assignment.due_at) return false;
    const dueDate = new Date(assignment.due_at);
    return dueDate >= startDate && dueDate <= endDate;
  });
}

/**
 * List assignments due this week
 */
export async function listAssignmentsDueThisWeek(courseId: number): Promise<Assignment[]> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  return listAssignmentsDueInRange(courseId, startOfWeek, endOfWeek);
}

/**
 * List upcoming assignments (next N days)
 */
export async function listUpcomingAssignments(
  courseId: number,
  days: number = 7
): Promise<Assignment[]> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + days);

  return listAssignmentsDueInRange(courseId, now, endDate);
}

/**
 * List overdue assignments
 */
export async function listOverdueAssignments(courseId: number): Promise<Assignment[]> {
  return listAssignments({
    course_id: courseId,
    bucket: "overdue",
    include: ["submission"],
  });
}

/**
 * List unsubmitted assignments that are past their due date
 * This catches items that Canvas hasn't flagged as "missing" yet
 */
export async function listUnsubmittedPastDue(courseId: number): Promise<Assignment[]> {
  const assignments = await listAssignments({
    course_id: courseId,
    include: ["submission"],
    order_by: "due_at",
  });

  const now = new Date();

  return assignments.filter((assignment) => {
    // Must have a due date
    if (!assignment.due_at) return false;

    // Due date must be in the past
    const dueDate = new Date(assignment.due_at);
    if (dueDate >= now) return false;

    // Must not be submitted
    const submission = assignment.submission;
    if (!submission) return true; // No submission record at all
    if (!submission.submitted_at) return true; // Has record but not submitted

    return false;
  });
}

/**
 * List unsubmitted past-due assignments across multiple courses
 */
export async function listUnsubmittedPastDueForCourses(
  courseIds: number[]
): Promise<(Assignment & { course_name?: string })[]> {
  const results: (Assignment & { course_name?: string })[] = [];

  for (const courseId of courseIds) {
    try {
      const assignments = await listUnsubmittedPastDue(courseId);
      results.push(...assignments);
    } catch {
      // Skip courses we can't access
    }
  }

  // Sort by due date (most recent first)
  return results.sort((a, b) => {
    if (!a.due_at || !b.due_at) return 0;
    return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
  });
}
