import { afterEach, describe, expect, it } from "vitest";
import { isOpenAIProviderConfigured, openAIApiKey } from "@/packages/ai/src/provider-config";

const original = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
};

afterEach(() => {
  restore("OPENAI_API_KEY", original.OPENAI_API_KEY);
  restore("AI_API_KEY", original.AI_API_KEY);
  restore("AI_PROVIDER", original.AI_PROVIDER);
});

describe("OpenAI provider configuration", () => {
  it("uses the standard server-side key name", () => {
    process.env.OPENAI_API_KEY = " standard-key ";
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
    expect(openAIApiKey()).toBe("standard-key");
    expect(isOpenAIProviderConfigured()).toBe(true);
  });

  it("keeps the legacy key name as a compatibility fallback", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.AI_API_KEY = "legacy-key";
    process.env.AI_PROVIDER = "openai";
    expect(openAIApiKey()).toBe("legacy-key");
    expect(isOpenAIProviderConfigured()).toBe(true);
  });

  it("allows an explicit non-OpenAI provider to keep the integration disabled", () => {
    process.env.OPENAI_API_KEY = "standard-key";
    process.env.AI_PROVIDER = "mock";
    expect(isOpenAIProviderConfigured()).toBe(false);
  });
});

function restore(key: keyof typeof original, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
