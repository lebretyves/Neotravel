import { createOpenAI } from "@ai-sdk/openai";
import { gateway, type LanguageModel } from "ai";

export type AiProviderSelection = {
  provider: "vercel-gateway" | "openrouter";
  modelId: string;
  model: LanguageModel;
};

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b:free";
const DEFAULT_GATEWAY_MODEL = "openai/gpt-5-mini";

export function getChatModel(): AiProviderSelection | null {
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const openRouterApiKey = process.env.AI_API_KEY?.trim();

  if (gatewayApiKey) {
    const modelId = process.env.AI_GATEWAY_MODEL_ID?.trim() || process.env.AI_MODEL_ID?.trim() || DEFAULT_GATEWAY_MODEL;

    return {
      provider: "vercel-gateway",
      modelId,
      model: gateway(modelId),
    };
  }

  if (openRouterApiKey) {
    const modelId = process.env.AI_MODEL_ID?.trim() || DEFAULT_OPENROUTER_MODEL;
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterApiKey,
    });

    return {
      provider: "openrouter",
      modelId,
      model: openrouter(modelId),
    };
  }

  return null;
}
