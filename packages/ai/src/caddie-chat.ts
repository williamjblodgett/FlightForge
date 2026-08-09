import { fallbackCaddieAnswer } from "@/modules/ai-caddie/knowledge";

export type CaddieChatTurn = { role: "user" | "assistant"; content: string };
export type CaddieChatResult = {
  answer: string;
  provider: "OPENAI" | "FLIGHTFORGE_FALLBACK";
  model: string;
  confidence: "LOW" | "MEDIUM";
  safetyResult: "PASS" | "BLOCKED" | "PROVIDER_UNAVAILABLE";
};

export async function generateCaddieChat(input: {
  message: string;
  instructions: string;
  bagSummary: string;
  history: CaddieChatTurn[];
  safetyIdentifier: string;
}): Promise<CaddieChatResult> {
  const apiKey = process.env.AI_API_KEY?.trim();
  const providerEnabled = process.env.AI_PROVIDER?.toLowerCase() === "openai";
  if (!apiKey || !providerEnabled) return fallback(input.message, input.bagSummary, "PROVIDER_UNAVAILABLE");

  const moderation = await moderate(input.message, apiKey, input.safetyIdentifier).catch(() => null);
  if (moderation?.flagged) {
    return {
      answer: "I cannot help with that request. I can still help with disc selection, course strategy, rules, safe practice, or general throwing technique.",
      provider: "OPENAI",
      model: "omni-moderation-latest",
      confidence: "MEDIUM",
      safetyResult: "BLOCKED",
    };
  }

  const model = process.env.AI_MODEL?.trim() || "gpt-5.6";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "OpenAI-Safety-Identifier": input.safetyIdentifier,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: input.instructions,
        input: [...input.history.slice(-8), { role: "user", content: input.message }],
        max_output_tokens: 500,
      }),
    });
    if (!response.ok) return fallback(input.message, input.bagSummary, "PROVIDER_UNAVAILABLE");
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const answer = payload.output_text?.trim() || payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text?.trim();
    if (!answer) return fallback(input.message, input.bagSummary, "PROVIDER_UNAVAILABLE");
    return { answer, provider: "OPENAI", model, confidence: "MEDIUM", safetyResult: "PASS" };
  } catch {
    return fallback(input.message, input.bagSummary, "PROVIDER_UNAVAILABLE");
  }
}

async function moderate(message: string, apiKey: string, safetyIdentifier: string): Promise<{ flagged: boolean }> {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "OpenAI-Safety-Identifier": safetyIdentifier },
    body: JSON.stringify({ model: "omni-moderation-latest", input: message }),
  });
  if (!response.ok) throw new Error("Moderation unavailable");
  const payload = await response.json() as { results?: Array<{ flagged?: boolean }> };
  return { flagged: payload.results?.[0]?.flagged === true };
}

function fallback(message: string, bagSummary: string, safetyResult: CaddieChatResult["safetyResult"]): CaddieChatResult {
  const result = fallbackCaddieAnswer(message, bagSummary);
  return { answer: result.answer, provider: "FLIGHTFORGE_FALLBACK", model: "field-guide-1.0", confidence: result.confidence, safetyResult };
}
