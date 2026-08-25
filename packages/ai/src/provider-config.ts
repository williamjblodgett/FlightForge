/**
 * Resolve the server-only OpenAI credential without ever exposing it to client code.
 * OPENAI_API_KEY is the standard name; AI_API_KEY remains a temporary compatibility alias.
 */
export function openAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || null;
}

export function isOpenAIProviderConfigured(): boolean {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  return Boolean(openAIApiKey() && (!provider || provider === "openai"));
}
