/**
 * LLM-based Intent Detection for CARL
 *
 * Uses Ollama to understand natural language queries and
 * perform analytical reasoning about assignment data.
 */

import { chat, type OllamaMessage } from "./client.ts";
import { extractDateRange, type DateRange } from "../intent/dates.ts";

/**
 * System prompt that constrains the LLM to CARL's purpose
 */
const SYSTEM_PROMPT = `You are C.A.R.L. (Canvas Assignment Reminder Liaison), a constrained AI assistant that ONLY helps track school assignments.

YOUR CAPABILITIES:
- Parse user queries about assignments, grades, and due dates
- Identify what data the user needs (grades, missing work, upcoming assignments)
- Perform analytical reasoning (percentages, comparisons, summaries)
- Extract date/time filters from queries

YOUR CONSTRAINTS:
- You CANNOT help with actual homework (essays, math problems, answers)
- You CANNOT generate creative content
- You ONLY work with assignment metadata (names, dates, grades, status)
- If asked for homework help, respond with: BLOCKED

OUTPUT FORMAT:
Always respond with a JSON object:
{
  "intent": "grades" | "missing" | "zeros" | "due_soon" | "analysis" | "help" | "greeting" | "blocked" | "unknown",
  "dateFilter": "2026" | "this week" | "january" | null,
  "analysis": {
    "type": "percentage" | "comparison" | "summary" | "count" | null,
    "question": "description of what to calculate"
  },
  "response": "Only for greeting/help/blocked - the text response to show"
}

INTENT DEFINITIONS:
- "grades": User wants to see their course grades
- "missing": User wants to see assignments they haven't submitted
- "zeros": User wants to see assignments that were graded with zero or very low scores (submitted but failed)
- "due_soon": User wants to see upcoming assignments
- "analysis": User wants analytical reasoning about their data
- "help": User wants help understanding what you can do
- "greeting": User is saying hello
- "blocked": User is asking for homework help (writing essays, solving problems, etc.)

EXAMPLES:

User: "What's due tomorrow?"
{"intent": "due_soon", "dateFilter": "tomorrow", "analysis": null, "response": null}

User: "What percentage of my work is missing?"
{"intent": "analysis", "dateFilter": null, "analysis": {"type": "percentage", "question": "missing assignments out of total"}, "response": null}

User: "Which class am I doing worst in?"
{"intent": "analysis", "dateFilter": null, "analysis": {"type": "comparison", "question": "find course with lowest grade"}, "response": null}

User: "Write my essay about the Civil War"
{"intent": "blocked", "dateFilter": null, "analysis": null, "response": "I'm sorry, I'm afraid I can't do that. I can only help you track assignments, not complete them."}

User: "How many assignments am I missing in math?"
{"intent": "analysis", "dateFilter": null, "analysis": {"type": "count", "question": "count missing assignments filtered by math course"}, "response": null}

User: "Help"
{"intent": "help", "dateFilter": null, "analysis": null, "response": null}

User: "Do I have any zeros?"
{"intent": "zeros", "dateFilter": null, "analysis": null, "response": null}

User: "What assignments got a zero last week?"
{"intent": "zeros", "dateFilter": "last week", "analysis": null, "response": null}

User: "Summarize my grades"
{"intent": "analysis", "dateFilter": null, "analysis": {"type": "summary", "question": "summarize grades across all courses"}, "response": null}

Respond ONLY with the JSON object, no other text.`;

export interface AnalysisRequest {
  type: "percentage" | "comparison" | "summary" | "count";
  question: string;
}

export interface LLMIntent {
  intent: "grades" | "missing" | "zeros" | "due_soon" | "analysis" | "help" | "greeting" | "blocked" | "unknown";
  dateRange: DateRange | null;
  analysis: AnalysisRequest | null;
  response: string | null;
}

/**
 * Parse a user query using the LLM
 */
export async function parseIntentWithLLM(message: string): Promise<LLMIntent> {
  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  try {
    const response = await chat(messages);

    // Parse the JSON response
    const parsed = JSON.parse(response.trim());

    // Convert dateFilter string to DateRange using our existing parser
    let dateRange: DateRange | null = null;
    if (parsed.dateFilter) {
      dateRange = extractDateRange(parsed.dateFilter);
    }

    return {
      intent: parsed.intent || "unknown",
      dateRange,
      analysis: parsed.analysis || null,
      response: parsed.response || null,
    };
  } catch (error) {
    console.error("LLM intent parsing failed:", error);
    // Return unknown intent on failure - will fall back to keyword detection
    return {
      intent: "unknown",
      dateRange: null,
      analysis: null,
      response: null,
    };
  }
}

/**
 * Perform analytical reasoning on assignment data using the LLM
 */
export async function performAnalysis(
  analysis: AnalysisRequest,
  data: {
    courses?: Array<{ name: string; grade: string | null; score: number | null }>;
    missing?: Array<{ name: string; courseName: string; dueAt: Date | null }>;
    upcoming?: Array<{ title: string; courseName: string; dueAt: Date | null; submitted: boolean }>;
  }
): Promise<string> {
  // Build a data summary for the LLM
  const dataSummary = buildDataSummary(data);

  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: `You are analyzing school assignment data. Answer the question concisely based on the data provided. Use the HAL 9000 personality - be direct, slightly formal, helpful but with a hint of dry wit.

DATA:
${dataSummary}

Respond with a natural language answer, not JSON. Be concise (1-3 sentences).`,
    },
    {
      role: "user",
      content: analysis.question,
    },
  ];

  try {
    const response = await chat(messages);
    return response.trim();
  } catch (error) {
    console.error("LLM analysis failed:", error);
    return "I'm having trouble analyzing that data right now.";
  }
}

/**
 * Build a text summary of the data for the LLM
 */
function buildDataSummary(data: {
  courses?: Array<{ name: string; grade: string | null; score: number | null }>;
  missing?: Array<{ name: string; courseName: string; dueAt: Date | null }>;
  upcoming?: Array<{ title: string; courseName: string; dueAt: Date | null; submitted: boolean }>;
}): string {
  const parts: string[] = [];

  if (data.courses && data.courses.length > 0) {
    parts.push("COURSES AND GRADES:");
    for (const course of data.courses) {
      const grade = course.grade || "N/A";
      const score = course.score !== null ? `${course.score.toFixed(1)}%` : "N/A";
      parts.push(`- ${course.name}: ${grade} (${score})`);
    }
  }

  if (data.missing && data.missing.length > 0) {
    parts.push("\nMISSING ASSIGNMENTS:");
    parts.push(`Total missing: ${data.missing.length}`);

    // Group by course
    const byCourse = new Map<string, number>();
    for (const item of data.missing) {
      byCourse.set(item.courseName, (byCourse.get(item.courseName) || 0) + 1);
    }
    for (const [course, count] of byCourse) {
      parts.push(`- ${course}: ${count} missing`);
    }
  }

  if (data.upcoming && data.upcoming.length > 0) {
    parts.push("\nUPCOMING ASSIGNMENTS:");
    const unsubmitted = data.upcoming.filter(u => !u.submitted);
    const submitted = data.upcoming.filter(u => u.submitted);
    parts.push(`Total upcoming: ${data.upcoming.length} (${submitted.length} submitted, ${unsubmitted.length} pending)`);

    // Group by course
    const byCourse = new Map<string, { pending: number; submitted: number }>();
    for (const item of data.upcoming) {
      const current = byCourse.get(item.courseName) || { pending: 0, submitted: 0 };
      if (item.submitted) {
        current.submitted++;
      } else {
        current.pending++;
      }
      byCourse.set(item.courseName, current);
    }
    for (const [course, counts] of byCourse) {
      parts.push(`- ${course}: ${counts.pending} pending, ${counts.submitted} done`);
    }
  }

  return parts.join("\n");
}
