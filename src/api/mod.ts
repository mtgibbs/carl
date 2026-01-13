/**
 * C.A.R.L. Canvas API Module
 *
 * TODO: Copy your Canvas API code from canvas-mcp/src/api/ here.
 *
 * Expected exports:
 * - getCoursesWithGrades()
 * - getMissingAssignments(studentId)
 * - getUnsubmittedPastDue(studentId)
 * - getDueThisWeek(studentId, days)
 * - getTodoItems(studentId, days)
 */

export interface Course {
  id: number;
  name: string;
  grade?: string;
  score?: number;
}

export interface Assignment {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
  dueAt: Date | null;
  pointsPossible: number;
  submitted: boolean;
  missing: boolean;
}

// Placeholder implementations - replace with your actual Canvas API code

export async function getCoursesWithGrades(): Promise<Course[]> {
  throw new Error("Not implemented - copy your Canvas API code here");
}

export async function getMissingAssignments(_studentId: string): Promise<Assignment[]> {
  throw new Error("Not implemented - copy your Canvas API code here");
}

export async function getUnsubmittedPastDue(_studentId: string): Promise<Assignment[]> {
  throw new Error("Not implemented - copy your Canvas API code here");
}

export async function getDueThisWeek(_studentId: string, _days = 7): Promise<Assignment[]> {
  throw new Error("Not implemented - copy your Canvas API code here");
}

export async function getTodoItems(_studentId: string, _days = 7): Promise<unknown[]> {
  throw new Error("Not implemented - copy your Canvas API code here");
}
