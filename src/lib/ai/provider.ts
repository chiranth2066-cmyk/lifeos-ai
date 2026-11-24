import type { ZodSchema } from "zod";
import { GeminiLLMProvider } from "./gemini";
import { getServerCapabilities } from "@/lib/env";

export interface LLMGenerateOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema?: ZodSchema<T>;
  temperature?: number;
}

export interface LLMResponse<T> {
  data: T;
  provider: string;
  model: string;
  isLiveLLM: boolean;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateJSON<T>(options: LLMGenerateOptions<T>): Promise<LLMResponse<T> | null>;
  generateText(options: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<{ text: string; provider: string; model: string; isLiveLLM: boolean } | null>;
}

const providerRegistry = new Map<string, LLMProvider>();

export function registerLLMProvider(provider: LLMProvider): void {
  providerRegistry.set(provider.name, provider);
}

export function getPrimaryLLMProvider(): LLMProvider {
  if (!providerRegistry.has("gemini")) {
    registerLLMProvider(new GeminiLLMProvider());
  }
  const caps = getServerCapabilities();
  const preferred = providerRegistry.get("gemini")!;
  if (caps.geminiConfigured && preferred.isAvailable()) {
    return preferred;
  }
  return preferred;
}

