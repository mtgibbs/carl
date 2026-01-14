/**
 * Enhanced Intent Detection for CARL
 *
 * Combines keyword-based intent detection with date extraction
 * to understand queries like "What am I missing for 2026?"
 */

import { extractDateRange, type DateRange } from "./dates.ts";

export { extractDateRange, isWithinRange, filterByDateRange, type DateRange } from "./dates.ts";

export type IntentType =
  | "grades"
  | "missing"
  | "zeros"
  | "due_soon"
  | "priority"
  | "risk"
  | "course_grades"
  | "percentage"
  | "help"
  | "greeting"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  dateRange: DateRange | null;
  courseFilter: string | null;
  raw: string;
}

/** Subject keywords to detect in queries */
const SUBJECT_KEYWORDS = [
  "math", "algebra", "geometry", "calculus",
  "science", "physics", "chemistry", "biology",
  "english", "ela", "language arts", "writing", "literature",
  "history", "social studies", "government", "civics",
  "spanish", "french",
  "art", "music", "band", "orchestra", "choir",
  "pe", "physical education", "gym", "health",
  "computer", "computers", "programming", "coding",
];

/**
 * Extract course filter from a query
 */
function extractCourseFilter(message: string): string | null {
  const lower = message.toLowerCase();
  for (const subject of SUBJECT_KEYWORDS) {
    if (lower.includes(subject)) {
      // Return the canonical form (first in each group)
      if (["math", "algebra", "geometry", "calculus"].includes(subject)) return "math";
      if (["science", "physics", "chemistry", "biology"].includes(subject)) return "science";
      if (["english", "ela", "language arts", "writing", "literature"].includes(subject)) return "english";
      if (["history", "social studies", "government", "civics"].includes(subject)) return "history";
      if (["spanish"].includes(subject)) return "spanish";
      if (["french"].includes(subject)) return "french";
      if (["art"].includes(subject)) return "art";
      if (["music", "band", "orchestra", "choir"].includes(subject)) return "music";
      if (["pe", "physical education", "gym", "health"].includes(subject)) return "pe";
      if (["computer", "computers", "programming", "coding"].includes(subject)) return "computer";
      return subject;
    }
  }
  return null;
}

/**
 * Parse a user query into intent + optional date range
 */
export function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase();

  // Extract date context first
  const dateRange = extractDateRange(message);

  // Extract course filter
  const courseFilter = extractCourseFilter(message);

  // Detect intent type
  let type: IntentType = "unknown";

  // Percentage queries - "what percentage", "how much is missing", "%"
  // Must come before "missing" check to catch "percentage...missing"
  if (
    (lower.includes("percent") || lower.includes("%") || lower.includes("how much")) &&
    (lower.includes("missing") || lower.includes("incomplete") || lower.includes("done"))
  ) {
    type = "percentage";
  }
  // Course-specific grades - detect subject + "how" or "doing"
  // Must come before general "grades" check
  else if (
    (lower.includes("how") || lower.includes("doing") || lower.includes("grade")) &&
    (lower.includes("math") ||
      lower.includes("science") ||
      lower.includes("english") ||
      lower.includes("history") ||
      lower.includes("spanish") ||
      lower.includes("french") ||
      lower.includes("art") ||
      lower.includes("music") ||
      lower.includes("pe") ||
      lower.includes("computer"))
  ) {
    type = "course_grades";
  }
  // Grades queries (all courses)
  else if (
    lower.includes("grade") ||
    lower.includes("score") ||
    lower.includes("how am i doing") ||
    lower.includes("my classes")
  ) {
    type = "grades";
  }
  // Missing assignments
  else if (
    lower.includes("missing") ||
    lower.includes("overdue") ||
    lower.includes("late") ||
    lower.includes("haven't submitted") ||
    lower.includes("forgot")
  ) {
    type = "missing";
  }
  // Zero/low grade assignments (graded but scored poorly)
  else if (
    lower.includes("zero") ||
    lower.includes(" 0 ") ||
    lower.match(/\b0\b/) ||
    lower.includes("low grade") ||
    lower.includes("bombed")
  ) {
    type = "zeros";
  }
  // Priority queries - "what should I work on", "prioritize", "focus"
  else if (
    lower.includes("work on first") ||
    lower.includes("prioritize") ||
    lower.includes("priority") ||
    lower.includes("what should i do") ||
    lower.includes("most important") ||
    lower.includes("focus on") ||
    lower.includes("start with")
  ) {
    type = "priority";
  }
  // Risk assessment - "at risk", "failing", "in danger"
  else if (
    lower.includes("at risk") ||
    lower.includes("gonna fail") ||
    lower.includes("going to fail") ||
    lower.includes("in danger") ||
    lower.includes("in trouble") ||
    (lower.includes("fail") && (lower.includes("class") || lower.includes("course") || lower.includes("any")))
  ) {
    type = "risk";
  }
  // Due soon / upcoming
  else if (
    lower.includes("due") ||
    lower.includes("upcoming") ||
    lower.includes("this week") ||
    lower.includes("tomorrow") ||
    lower.includes("today") ||
    lower.includes("what's left") ||
    lower.includes("to do") ||
    lower.includes("todo")
  ) {
    type = "due_soon";
  }
  // Help
  else if (
    lower.includes("help") ||
    lower.includes("what can you") ||
    lower.includes("how do i")
  ) {
    type = "help";
  }
  // Greetings
  else if (
    lower.match(/^(hi|hello|hey|sup|yo|greetings)/i) ||
    lower === "hi" ||
    lower === "hello"
  ) {
    type = "greeting";
  }

  return {
    type,
    dateRange,
    courseFilter,
    raw: message,
  };
}
