import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { modelConfig, type AiProviderName } from "./modelConfig";
import { hasAiApiKey } from "./openaiClient";

export type ModelProvider = {
 provider: AiProviderName;
 model: string;
 mode: "mock" | "real";
 canUseRealModel: boolean;
};

export function getModelProvider(): ModelProvider {
 const provider = modelConfig.provider;
 const canUseConfiguredProvider = provider === "openai" || provider === "vercel-ai-gateway";
 const forceMock = isDemoMode() || provider === "mock" || !canUseConfiguredProvider || !hasAiApiKey(provider);

 if (forceMock) {
  return {
   provider: "mock",
   model: "mock",
   mode: "mock",
   canUseRealModel: false
  };
 }

 return {
  provider,
  model: modelConfig.model,
  mode: "real",
  canUseRealModel: canUseConfiguredProvider
 };
}
