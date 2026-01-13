/**
 * C.A.R.L. Discord Bot
 *
 * Sends scheduled notifications about assignments.
 * "Good morning. You have 3 items due today."
 */

// Discord webhook URL from environment
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

interface Assignment {
  name: string;
  course: string;
  dueAt: Date;
}

export async function sendNotification(message: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not set");
    return;
  }

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "C.A.R.L.",
      content: message,
    }),
  });
}

export function formatDailyDigest(assignments: Assignment[]): string {
  if (assignments.length === 0) {
    return "Good morning. No assignments due today. Impressive.";
  }

  const lines = [
    `Good morning. You have ${assignments.length} item${assignments.length === 1 ? "" : "s"} due today:`,
    "",
    ...assignments.map((a) => `• **${a.name}** (${a.course})`),
  ];

  return lines.join("\n");
}

export function formatMissingAlert(assignments: Assignment[]): string {
  if (assignments.length === 0) {
    return "";
  }

  if (assignments.length === 1) {
    return `Heads up: "${assignments[0].name}" in ${assignments[0].course} is missing.`;
  }

  return `Heads up: You have ${assignments.length} missing assignments. Might want to look into that.`;
}

// Main entry point for running as a standalone notification service
if (import.meta.main) {
  console.log("C.A.R.L. Discord Bot");
  console.log("=".repeat(40));

  // TODO: Connect to Canvas API and fetch assignments
  // TODO: Set up cron schedule for daily notifications

  console.log("Webhook URL configured:", !!DISCORD_WEBHOOK_URL);
  console.log("\nBot is not yet implemented. Copy your Canvas API code to src/api/");
}
