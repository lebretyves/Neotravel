import OpenAI from "openai";
import { modelConfig, type AiProviderName } from "./modelConfig";

const VERCEL_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

export function getAiApiKey(provider: AiProviderName = modelConfig.provider) {
 if (provider === "vercel-ai-gateway") {
  return process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
 }

 return process.env.OPENAI_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? "";
}

export function getAiBaseUrl(provider: AiProviderName = modelConfig.provider) {
 return (
  process.env.AI_BASE_URL ??
  process.env.OPENAI_BASE_URL ??
  (provider === "vercel-ai-gateway" ? VERCEL_AI_GATEWAY_BASE_URL : undefined)
 );
}

export function hasAiApiKey(provider: AiProviderName = modelConfig.provider) {
 return getAiApiKey(provider).trim().length > 0;
}

export function getOpenAIClient(provider: AiProviderName = modelConfig.provider) {
 const baseURL = getAiBaseUrl(provider);

 return new OpenAI({
  apiKey: getAiApiKey(provider),
  ...(baseURL ? { baseURL } : {})
 });
}
