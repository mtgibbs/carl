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
  | "due_soon"
  | "help"
  | "greeting"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  dateRange: DateRange | null;
  raw: string;
}

/**
 * Parse a user query into intent + optional date range
 */
export function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase();

  // Extract date context first
  const dateRange = extractDateRange(message);

  // Detect intent type
  let type: IntentType = "unknown";

  // Grades queries
  if (
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
    raw: message,
  };
}
