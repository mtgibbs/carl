/**
 * Canvas Enrollments API
 * Direct access to enrollment data (grades, etc.)
 */

import { getClient } from "./client.ts";
import type { Enrollment } from "./types.ts";

/**
 * List enrollments for a user across all courses
 */
export async function listUserEnrollments(
  userId: string | number = "self",
  options?: {
    type?: string[];
    state?: string[];
    include?: string[];
  }
): Promise<Enrollment[]> {
  const client = getClient();

  const params: Record<string, string | string[] | undefined> = {};

  if (options?.type) {
    params.type = options.type;
  }
  if (options?.state) {
    params.state = options.state;
  }
  if (options?.include) {
    params.include = options.include;
  }

  return client.getAll<Enrollment>(`/users/${userId}/enrollments`, params);
}

/**
 * Get active student enrollments with grades
 */
export async function getActiveEnrollmentsWithGrades(
  userId: string | number = "self"
): Promise<Enrollment[]> {
  return listUserEnrollments(userId, {
    type: ["StudentEnrollment"],
    state: ["active"],
  });
}

/**
 * Get enrollment grades summary
 */
export interface GradeSummary {
  courseId: number;
  courseName?: string;
  currentGrade: string | null;
  currentScore: number | null;
  finalGrade: string | null;
  finalScore: number | null;
}

export async function getGradesSummary(userId: string | number = "self"): Promise<GradeSummary[]> {
  const enrollments = await getActiveEnrollmentsWithGrades(userId);

  return enrollments.map((enrollment) => ({
    courseId: enrollment.course_id,
    currentGrade: enrollment.grades?.current_grade || null,
    currentScore: enrollment.grades?.current_score || null,
    finalGrade: enrollment.grades?.final_grade || null,
    finalScore: enrollment.grades?.final_score || null,
  }));
}
