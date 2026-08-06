import { z } from "zod";

export const throwAnalysisSchema = z.object({
  summary: z.string().min(1), effective: z.array(z.string()).max(3), priorityCorrection: z.string().min(1),
  secondaryObservations: z.array(z.string()).max(2), drill: z.string().min(1), nextCameraAngle: z.string().min(1),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]), limitations: z.array(z.string()).min(1), safetyNote: z.string().min(1),
});
export type ThrowAnalysis = z.infer<typeof throwAnalysisSchema>;
export type ThrowFrame = { dataUrl: string; label: string };

export interface MediaAnalysisProvider { analyzeThrow(input: { frames: ThrowFrame[]; context: Record<string, unknown>; poseSummary?: Record<string, unknown> }): Promise<ThrowAnalysis>; }

export class OpenAIFrameAnalysisProvider implements MediaAnalysisProvider {
  constructor(private readonly apiKey: string, private readonly model = process.env.AI_MODEL ?? "gpt-5.6", private readonly request: typeof fetch = fetch) {
    if (!apiKey) throw new Error("AI provider credentials are required.");
  }
  async analyzeThrow(input: { frames: ThrowFrame[]; context: Record<string, unknown>; poseSummary?: Record<string, unknown> }): Promise<ThrowAnalysis> {
    if (input.frames.length < 2 || input.frames.length > 8) throw new Error("Provide 2 to 8 consented keyframes.");
    const response = await this.request("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
      model: this.model, store: false, max_output_tokens: 900,
      input: [{ role: "system", content: "You are a cautious disc golf coaching assistant. Discuss only visible evidence. Never diagnose injuries or claim exact biomechanical, disc-angle, spin, or speed measurements. Provide one priority correction." }, { role: "user", content: [{ type: "input_text", text: `Context: ${JSON.stringify(input.context)}\nPose summary: ${JSON.stringify(input.poseSummary ?? {})}` }, ...input.frames.map((frame) => ({ type: "input_image", image_url: frame.dataUrl, detail: "high" }))] }],
      text: { format: { type: "json_schema", name: "flightforge_throw_analysis", strict: true, schema: { type: "object", additionalProperties: false, required: ["summary","effective","priorityCorrection","secondaryObservations","drill","nextCameraAngle","confidence","limitations","safetyNote"], properties: { summary: { type: "string" }, effective: { type: "array", items: { type: "string" }, maxItems: 3 }, priorityCorrection: { type: "string" }, secondaryObservations: { type: "array", items: { type: "string" }, maxItems: 2 }, drill: { type: "string" }, nextCameraAngle: { type: "string" }, confidence: { type: "string", enum: ["LOW","MEDIUM","HIGH"] }, limitations: { type: "array", items: { type: "string" }, minItems: 1 }, safetyNote: { type: "string" } } } } },
    }) });
    if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
    const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("AI provider returned no structured analysis.");
    return throwAnalysisSchema.parse(JSON.parse(text));
  }
}
