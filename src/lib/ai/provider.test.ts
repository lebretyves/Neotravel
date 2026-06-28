import { afterEach, describe, expect, it } from "vitest";

import { getChatModel } from "./provider";

const savedEnv = {
  AI_API_KEY: process.env.AI_API_KEY,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  AI_MODEL_ID: process.env.AI_MODEL_ID,
  AI_GATEWAY_MODEL_ID: process.env.AI_GATEWAY_MODEL_ID,
};

afterEach(() => {
  process.env.AI_API_KEY = savedEnv.AI_API_KEY;
  process.env.AI_GATEWAY_API_KEY = savedEnv.AI_GATEWAY_API_KEY;
  process.env.AI_MODEL_ID = savedEnv.AI_MODEL_ID;
  process.env.AI_GATEWAY_MODEL_ID = savedEnv.AI_GATEWAY_MODEL_ID;
});

describe("getChatModel", () => {
  it("prefers Vercel AI Gateway when AI_GATEWAY_API_KEY is set", () => {
    process.env.AI_GATEWAY_API_KEY = "gateway-key";
    process.env.AI_GATEWAY_MODEL_ID = "openai/gpt-5-mini";
    process.env.AI_API_KEY = "openrouter-key";
    process.env.AI_MODEL_ID = "openai/gpt-oss-120b:free";

    const selection = getChatModel();

    expect(selection).toMatchObject({
      provider: "vercel-gateway",
      modelId: "openai/gpt-5-mini",
    });
  });

  it("falls back to OpenRouter when only AI_API_KEY is set", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_GATEWAY_MODEL_ID;
    process.env.AI_API_KEY = "openrouter-key";
    process.env.AI_MODEL_ID = "openai/gpt-oss-120b:free";

    const selection = getChatModel();

    expect(selection).toMatchObject({
      provider: "openrouter",
      modelId: "openai/gpt-oss-120b:free",
    });
  });

  it("returns null when no supported provider key is set", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_API_KEY;

    expect(getChatModel()).toBeNull();
  });
});
