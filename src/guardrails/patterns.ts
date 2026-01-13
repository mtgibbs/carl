/**
 * C.A.R.L. Guardrails - Pattern Detection
 *
 * Catches homework help requests before they reach the LLM.
 */

const HOMEWORK_PATTERNS: RegExp[] = [
  // Writing requests
  /write\s+(my|a|an|the)?\s*(essay|paper|paragraph|response|report|summary)/i,
  /help\s+(me\s+)?(write|compose|draft)/i,

  // Solving requests
  /solve\s+(this|the|my)?\s*(problem|equation|question|math)/i,
  /what\s+is\s+the\s+(answer|solution)/i,
  /calculate\s+(this|the)/i,

  // Answer requests
  /answer\s+(this|the|my)?\s*(question|quiz|test)/i,
  /(give|tell)\s+me\s+the\s+answer/i,

  // Explanation requests (for homework content)
  /explain\s+(how\s+to\s+)?(solve|answer|do|write)/i,
  /how\s+do\s+(i|you)\s+(solve|answer|write)/i,

  // General homework help
  /do\s+(my|this)\s+(homework|assignment|work)/i,
  /finish\s+(my|this)\s+(homework|assignment|essay)/i,
];

export function isHomeworkRequest(input: string): boolean {
  return HOMEWORK_PATTERNS.some((pattern) => pattern.test(input));
}

export function detectHomeworkIntent(input: string): { blocked: boolean; matchedPattern?: string } {
  for (const pattern of HOMEWORK_PATTERNS) {
    if (pattern.test(input)) {
      return { blocked: true, matchedPattern: pattern.source };
    }
  }
  return { blocked: false };
}
