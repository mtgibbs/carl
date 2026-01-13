/**
 * Date extraction for CARL intent detection
 *
 * Parses common date patterns from natural language queries:
 * - Years: "2026", "in 2025"
 * - Relative: "today", "tomorrow", "this week", "next week"
 * - Months: "January", "in March"
 * - Semesters: "this semester", "fall", "spring"
 */

export interface DateRange {
  start: Date;
  end: Date;
  description: string;
}

/**
 * Extract a date range from a natural language query
 * Returns null if no date context is found
 */
export function extractDateRange(query: string): DateRange | null {
  const lower = query.toLowerCase();
  const now = new Date();

  // Year patterns: "2026", "in 2025", "for 2024"
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    return {
      start: new Date(year, 0, 1), // Jan 1
      end: new Date(year, 11, 31, 23, 59, 59), // Dec 31
      description: `${year}`,
    };
  }

  // Today
  if (lower.includes("today")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "today" };
  }

  // Tomorrow
  if (lower.includes("tomorrow")) {
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "tomorrow" };
  }

  // Yesterday
  if (lower.includes("yesterday")) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "yesterday" };
  }

  // This week
  if (lower.includes("this week")) {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek); // Go to Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "this week" };
  }

  // Next week
  if (lower.includes("next week")) {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() + (7 - dayOfWeek)); // Next Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Next Saturday
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "next week" };
  }

  // Last week
  if (lower.includes("last week")) {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek - 7); // Previous Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Previous Saturday
    end.setHours(23, 59, 59, 999);
    return { start, end, description: "last week" };
  }

  // This month
  if (lower.includes("this month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end, description: "this month" };
  }

  // Next month
  if (lower.includes("next month")) {
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    return { start, end, description: "next month" };
  }

  // Month names (current or next occurrence)
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const monthAbbrevs = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];

  for (let i = 0; i < months.length; i++) {
    if (lower.includes(months[i]) || lower.match(new RegExp(`\\b${monthAbbrevs[i]}\\b`))) {
      // Determine which year - if month has passed, assume next year
      let year = now.getFullYear();
      if (i < now.getMonth()) {
        year++; // Month already passed this year
      }
      const start = new Date(year, i, 1);
      const end = new Date(year, i + 1, 0, 23, 59, 59);
      return { start, end, description: `${months[i]} ${year}` };
    }
  }

  // Semester patterns
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Fall semester (August - December)
  if (lower.includes("fall semester") || (lower.includes("fall") && !lower.includes("fall behind"))) {
    // Determine which fall
    let year = currentYear;
    if (currentMonth > 11) year++; // If we're past December, next fall
    const start = new Date(year, 7, 1); // August 1
    const end = new Date(year, 11, 31, 23, 59, 59); // December 31
    return { start, end, description: `fall ${year}` };
  }

  // Spring semester (January - May)
  if (lower.includes("spring semester") || (lower.includes("spring") && !lower.includes("spring break"))) {
    let year = currentYear;
    if (currentMonth > 4) year++; // If we're past May, next spring
    const start = new Date(year, 0, 1); // January 1
    const end = new Date(year, 4, 31, 23, 59, 59); // May 31
    return { start, end, description: `spring ${year}` };
  }

  // This semester (context-aware)
  if (lower.includes("this semester")) {
    if (currentMonth >= 7 && currentMonth <= 11) {
      // Fall semester
      const start = new Date(currentYear, 7, 1);
      const end = new Date(currentYear, 11, 31, 23, 59, 59);
      return { start, end, description: `fall ${currentYear}` };
    } else {
      // Spring semester
      const year = currentMonth < 5 ? currentYear : currentYear + 1;
      const start = new Date(year, 0, 1);
      const end = new Date(year, 4, 31, 23, 59, 59);
      return { start, end, description: `spring ${year}` };
    }
  }

  // Last semester
  if (lower.includes("last semester")) {
    if (currentMonth >= 0 && currentMonth <= 6) {
      // We're in spring, last semester was fall of previous year
      const year = currentYear - 1;
      const start = new Date(year, 7, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end, description: `fall ${year}` };
    } else {
      // We're in fall, last semester was spring of this year
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 4, 31, 23, 59, 59);
      return { start, end, description: `spring ${currentYear}` };
    }
  }

  // "Next N days" pattern
  const nextDaysMatch = lower.match(/next\s+(\d+)\s+days?/);
  if (nextDaysMatch) {
    const days = parseInt(nextDaysMatch[1]);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    end.setHours(23, 59, 59, 999);
    return { start, end, description: `next ${days} days` };
  }

  return null;
}

/**
 * Check if a date falls within a date range
 */
export function isWithinRange(date: Date | null, range: DateRange): boolean {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

/**
 * Filter items by date range
 * Items with null dates are excluded when a range is specified
 */
export function filterByDateRange<T extends { dueAt: Date | null }>(
  items: T[],
  range: DateRange | null
): T[] {
  if (!range) return items;
  return items.filter((item) => isWithinRange(item.dueAt, range));
}
