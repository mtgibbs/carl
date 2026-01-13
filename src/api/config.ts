/**
 * Configuration loader for CARL
 * Loads Canvas API settings from environment variables
 */

import { load } from "@std/dotenv";

export interface Config {
  apiToken: string;
  baseUrl: string;
  studentId: string;
}

let cachedConfig: Config | null = null;

/**
 * Load configuration from environment variables
 * Tries to load from .env file first, then falls back to process env
 */
export async function loadConfig(): Promise<Config> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Try to load .env file (won't throw if it doesn't exist)
  try {
    await load({ export: true });
  } catch {
    // .env file doesn't exist, that's fine - we'll use process env
  }

  const apiToken = Deno.env.get("CANVAS_API_TOKEN");
  const baseUrl = Deno.env.get("CANVAS_BASE_URL");
  const studentId = Deno.env.get("CANVAS_STUDENT_ID") || "self";

  if (!apiToken) {
    throw new Error(
      "CANVAS_API_TOKEN is required. Set it in .env or as an environment variable.\n" +
        "Generate a token at: Canvas > Account > Settings > Approved Integrations > New Access Token"
    );
  }

  if (!baseUrl) {
    throw new Error(
      "CANVAS_BASE_URL is required. Set it in .env or as an environment variable.\n" +
        "Example: https://yourschool.instructure.com"
    );
  }

  // Remove trailing slash if present
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  cachedConfig = {
    apiToken,
    baseUrl: normalizedBaseUrl,
    studentId,
  };

  return cachedConfig;
}

/**
 * Get config synchronously (must call loadConfig first)
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return cachedConfig;
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
