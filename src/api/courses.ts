/**
 * Canvas Courses API
 */

import { getClient } from "./client.ts";
import type { Course, Enrollment, ListCoursesOptions } from "./types.ts";

/**
 * List all courses for the authenticated user
 */
export async function listCourses(options?: ListCoursesOptions): Promise<Course[]> {
  const client = getClient();

  const params: Record<string, string | string[] | undefined> = {};

  if (options?.enrollment_type) {
    params.enrollment_type = options.enrollment_type;
  }
  if (options?.enrollment_state) {
    params.enrollment_state = options.enrollment_state;
  }
  if (options?.include) {
    params.include = options.include;
  }
  if (options?.state) {
    params.state = options.state;
  }

  return client.getAll<Course>("/courses", params);
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId: number): Promise<Course> {
  const client = getClient();
  return client.get<Course>(`/courses/${courseId}`);
}

/**
 * List enrollments for a course (includes grade info)
 */
export async function listCourseEnrollments(
  courseId: number,
  options?: {
    type?: string[];
    state?: string[];
    userId?: number | string;
  }
): Promise<Enrollment[]> {
  const client = getClient();

  const params: Record<string, string | string[] | number | undefined> = {};

  if (options?.type) {
    params.type = options.type;
  }
  if (options?.state) {
    params.state = options.state;
  }
  if (options?.userId) {
    params.user_id = options.userId;
  }

  return client.getAll<Enrollment>(`/courses/${courseId}/enrollments`, params);
}

/**
 * Get enrollment with grades for a specific user in a course
 */
export async function getUserEnrollment(
  courseId: number,
  userId: number | string
): Promise<Enrollment | null> {
  const enrollments = await listCourseEnrollments(courseId, {
    userId,
    type: ["StudentEnrollment"],
  });

  return enrollments[0] || null;
}

/**
 * List courses with grades for a user (observer or self)
 * Enriches course data with enrollment/grade information
 */
export async function listCoursesWithGrades(
  userId: string | number = "self"
): Promise<(Course & { enrollment?: Enrollment })[]> {
  // Get all active courses with enrollments included
  const courses = await listCourses({
    enrollment_state: "active",
    include: ["enrollments", "term"],
    state: ["available"],
  });

  // Filter and enrich with the specific user's enrollment data
  const coursesWithGrades = courses.map((course) => {
    // Find the enrollment for this user (or observed user)
    const enrollment = course.enrollments?.find((e) => {
      if (userId === "self") {
        return e.type === "StudentEnrollment" || e.type === "ObserverEnrollment";
      }
      return e.user_id === Number(userId) || e.observed_user?.id === Number(userId);
    });

    return {
      ...course,
      enrollment,
    };
  });

  return coursesWithGrades;
}
