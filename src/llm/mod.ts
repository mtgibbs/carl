/**
 * LLM Module for CARL
 *
 * Provides Ollama integration for enhanced intent detection
 * and analytical reasoning about assignment data.
 */

export {
  initOllama,
  isOllamaConfigured,
  isOllamaAvailable,
  loadOllamaConfig,
  getDetectedModel,
  chat,
  type OllamaConfig,
  type OllamaMessage,
} from "./client.ts";

export {
  parseIntentWithLLM,
  performAnalysis,
  type LLMIntent,
  type AnalysisRequest,
} from "./intent.ts";
