/**
 * C.A.R.L. - Canvas Assignment Reminder Liaison
 *
 * Main entry point for development.
 *
 * "I'm sorry, I'm afraid I can't do that."
 */

import { isHomeworkRequest, handleHomeworkRequest } from "./guardrails/mod.ts";

console.log(`
┌─────────────────────────────────────────────────┐
│                    C.A.R.L.                     │
│       Canvas Assignment Reminder Liaison        │
│                                                 │
│    "I'm sorry, I'm afraid I can't do that."    │
└─────────────────────────────────────────────────┘
`);

// Quick test of guardrails
const testInputs = [
  "what's due this week?",
  "write my essay about flowers for algernon",
  "any missing assignments?",
  "solve this math problem for me",
  "what about science class?",
  "help me do my homework",
];

console.log("Guardrails Test:");
console.log("=".repeat(50));

for (const input of testInputs) {
  const blocked = isHomeworkRequest(input);
  const status = blocked ? "🚫 BLOCKED" : "✅ ALLOWED";
  console.log(`${status}: "${input}"`);
}

console.log("\n" + "=".repeat(50));
console.log("HAL Response Test (simulating repeated attempts):");
console.log("=".repeat(50));

const testUserId = "test-user";
for (let i = 0; i < 5; i++) {
  const { response, lockedOut } = handleHomeworkRequest(testUserId);
  console.log(`Attempt ${i + 1}: ${response}${lockedOut ? " [LOCKED OUT]" : ""}`);
}

console.log("\n" + "=".repeat(50));
console.log("Next steps:");
console.log("1. Copy your Canvas API code to src/api/");
console.log("2. Run 'deno task discord' to start the Discord bot");
console.log("3. Run 'deno task web' to start the chat UI");
