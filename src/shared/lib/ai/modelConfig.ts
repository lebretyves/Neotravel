export type AiProviderName = "mock" | "openai" | "vercel-ai-gateway";

export const modelConfig = {
 provider: (process.env.AI_PROVIDER ?? "mock") as AiProviderName,
 model: process.env.AI_MODEL ?? "mock",
 extractionModel: process.env.AI_MODEL ?? "mock",
 summaryModel: process.env.AI_MODEL ?? "mock",
 temperature: 0.1
};
