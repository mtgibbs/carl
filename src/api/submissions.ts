/**
 * Canvas Submissions API
 */

import { getClient } from "./client.ts";
import type { Submission, ListSubmissionsOptions } from "./types.ts";

/**
 * List submissions for a course (all students or specific students)
 */
export async function listSubmissions(options: ListSubmissionsOptions): Promise<Submission[]> {
  const client = getClient();
  const { course_id, ...rest } = options;

  const params: Record<string, string | string[] | number | undefined> = {};

  if (rest.assignment_ids?.length) {
    params.assignment_ids = rest.assignment_ids.map(String);
  }
  if (rest.student_ids) {
    params.student_ids = rest.student_ids === "all" ? "all" : rest.student_ids.map(String);
  }
  if (rest.grouped !== undefined) {
    params.grouped = rest.grouped ? "true" : "false";
  }
  if (rest.include) {
    params.include = rest.include;
  }
  if (rest.workflow_state) {
    params.workflow_state = rest.workflow_state;
  }

  return client.getAll<Submission>(`/courses/${course_id}/students/submissions`, params);
}

/**
 * Get submission for a specific assignment and user
 */
export async function getSubmission(
  courseId: number,
  assignmentId: number,
  userId: number | string,
  include?: Array<"submission_history" | "submission_comments" | "rubric_assessment">
): Promise<Submission> {
  const client = getClient();

  const params: Record<string, string[] | undefined> = {};
  if (include) {
    params.include = include;
  }

  return client.get<Submission>(
    `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
    params
  );
}

/**
 * List all submissions for a specific user in a course
 */
export async function listUserSubmissions(
  courseId: number,
  userId: number | string,
  options?: {
    include?: Array<"submission_history" | "submission_comments" | "assignment" | "user">;
    workflowState?: "submitted" | "unsubmitted" | "graded" | "pending_review";
  }
): Promise<Submission[]> {
  return listSubmissions({
    course_id: courseId,
    student_ids: [Number(userId)],
    include: options?.include || ["assignment"],
    workflow_state: options?.workflowState,
  });
}

/**
 * List graded submissions for a user
 */
export async function listGradedSubmissions(
  courseId: number,
  userId: number | string
): Promise<Submission[]> {
  const submissions = await listUserSubmissions(courseId, userId, {
    include: ["assignment"],
  });

  return submissions.filter(
    (sub) => sub.workflow_state === "graded" && sub.grade !== null
  );
}

/**
 * List submissions with grades below a threshold
 */
export async function listSubmissionsBelowThreshold(
  courseId: number,
  userId: number | string,
  threshold: number
): Promise<Submission[]> {
  const submissions = await listGradedSubmissions(courseId, userId);

  return submissions.filter((sub) => {
    if (sub.score === null || sub.score === undefined) return false;
    const assignment = sub.assignment;
    if (!assignment?.points_possible) return false;

    const percentage = (sub.score / assignment.points_possible) * 100;
    return percentage < threshold;
  });
}

/**
 * List unsubmitted past-due assignments for a student
 * Uses the submissions endpoint to get the student's actual submission status
 */
export async function listUnsubmittedPastDueForStudent(
  courseId: number,
  studentId: number | string
): Promise<Submission[]> {
  const submissions = await listUserSubmissions(courseId, studentId, {
    include: ["assignment"],
  });

  const now = new Date();

  return submissions.filter((sub) => {
    // Must have an assignment with a due date
    const assignment = sub.assignment;
    if (!assignment?.due_at) return false;

    // Due date must be in the past
    const dueDate = new Date(assignment.due_at);
    if (dueDate >= now) return false;

    // Must not be submitted AND not graded
    // Some assignments (on_paper, etc.) may have a grade but no submitted_at
    if (sub.submitted_at) return false;
    if (sub.score !== null && sub.score !== undefined) return false;
    if (sub.grade !== null && sub.grade !== undefined) return false;

    return true;
  });
}
