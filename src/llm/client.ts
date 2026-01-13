/**
 * Ollama Client for CARL
 *
 * Simple HTTP client for interacting with Ollama's API.
 * Used for intent detection and analytical queries.
 * Auto-detects available model from Ollama server.
 */

export interface OllamaConfig {
  baseUrl: string;
  timeout?: number;
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    modified_at: string;
  }>;
}

let config: OllamaConfig | null = null;
let detectedModel: string | null = null;

/**
 * Initialize the Ollama client
 */
export function initOllama(cfg: OllamaConfig): void {
  config = cfg;
  detectedModel = null; // Reset detected model
}

/**
 * Check if Ollama is configured
 */
export function isOllamaConfigured(): boolean {
  return config !== null;
}

/**
 * Get the current config
 */
export function getOllamaConfig(): OllamaConfig {
  if (!config) {
    throw new Error("Ollama not configured. Call initOllama() first.");
  }
  return config;
}

/**
 * Get the detected model name
 */
export function getDetectedModel(): string | null {
  return detectedModel;
}

/**
 * Discover available models from Ollama and select one
 */
async function discoverModel(): Promise<string> {
  if (!config) {
    throw new Error("Ollama not configured. Call initOllama() first.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data: OllamaTagsResponse = await response.json();

    if (!data.models || data.models.length === 0) {
      throw new Error("No models available in Ollama. Pull a model first: ollama pull llama3.2:1b");
    }

    // Use the first available model
    return data.models[0].name;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Check if Ollama server is available and discover model
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (!config) return false;

  try {
    const model = await discoverModel();
    detectedModel = model;
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a chat completion request to Ollama
 */
export async function chat(messages: OllamaMessage[]): Promise<string> {
  if (!config) {
    throw new Error("Ollama not configured. Call initOllama() first.");
  }

  if (!detectedModel) {
    throw new Error("No model detected. Call isOllamaAvailable() first.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeout || 30000
  );

  try {
    const request: OllamaRequest = {
      model: detectedModel,
      messages,
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistent outputs
        num_predict: 500, // Limit response length
      },
    };

    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data: OllamaResponse = await response.json();
    return data.message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Ollama request timed out");
    }
    throw error;
  }
}

/**
 * Load Ollama config from environment variables
 * Only requires OLLAMA_URL - model is auto-detected
 */
export function loadOllamaConfig(): OllamaConfig | null {
  const baseUrl = Deno.env.get("OLLAMA_URL");

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    timeout: parseInt(Deno.env.get("OLLAMA_TIMEOUT") || "30000"),
  };
}
