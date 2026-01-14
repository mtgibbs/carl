/**
 * Course Filter - Fuzzy matching for course names
 *
 * Matches user input like "math" to actual course names like "P6-Math 8-HARRIS"
 */

import type { SimpleCourse } from "../api/mod.ts";

/** Common subject aliases that map to course name patterns */
const SUBJECT_ALIASES: Record<string, string[]> = {
  math: ["math", "algebra", "geometry", "calculus", "pre-calc", "precalc"],
  science: ["science", "physics", "chemistry", "biology", "bio", "chem", "phys"],
  english: ["english", "ela", "language arts", "writing", "literature", "lit"],
  history: ["history", "social studies", "government", "civics", "geography", "geo"],
  spanish: ["spanish", "español"],
  french: ["french", "français"],
  art: ["art", "drawing", "painting", "ceramics", "sculpture"],
  music: ["music", "band", "orchestra", "choir", "chorus"],
  pe: ["pe", "p.e.", "physical education", "gym", "health", "fitness"],
  computer: ["computer", "computers", "cs", "programming", "coding", "tech"],
};

/**
 * Find courses that match a user's filter string
 * Returns all courses if filter is empty or null
 */
export function filterCourses(
  courses: SimpleCourse[],
  filter: string | null
): SimpleCourse[] {
  if (!filter || filter.trim() === "") {
    return courses;
  }

  const lowerFilter = filter.toLowerCase().trim();
  const matched: SimpleCourse[] = [];

  for (const course of courses) {
    if (matchesCourse(course, lowerFilter)) {
      matched.push(course);
    }
  }

  return matched;
}

/**
 * Check if a course matches the filter string
 */
function matchesCourse(course: SimpleCourse, filter: string): boolean {
  const lowerName = course.name.toLowerCase();
  const lowerCode = course.code.toLowerCase();

  // Direct substring match on name or code
  if (lowerName.includes(filter) || lowerCode.includes(filter)) {
    return true;
  }

  // Check against subject aliases
  for (const [_subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.includes(filter)) {
      // If user typed an alias, check if course matches any alias in that group
      for (const alias of aliases) {
        if (lowerName.includes(alias) || lowerCode.includes(alias)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Find a single best-matching course for a filter
 * Returns null if no match or multiple matches
 */
export function findBestMatch(
  courses: SimpleCourse[],
  filter: string | null
): SimpleCourse | null {
  const matches = filterCourses(courses, filter);

  if (matches.length === 1) {
    return matches[0];
  }

  // If multiple matches, try to find exact match
  if (matches.length > 1 && filter) {
    const lowerFilter = filter.toLowerCase().trim();
    for (const course of matches) {
      if (course.name.toLowerCase() === lowerFilter || course.code.toLowerCase() === lowerFilter) {
        return course;
      }
    }
  }

  return null;
}

/**
 * Extract course filter from natural language query
 * Returns null if no course mentioned
 */
export function extractCourseFilter(query: string): string | null {
  const lower = query.toLowerCase();

  // Check for explicit subject mentions
  for (const [subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    for (const alias of aliases) {
      // Look for the alias as a standalone word
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(lower)) {
        return subject;
      }
    }
  }

  return null;
}
