import { describe, expect, it } from "vitest";
import { OpenAIFrameAnalysisProvider } from "./media-analysis";

describe("multimodal provider boundary", () => {
  it("validates structured responses and disables provider-side storage", async () => {
    let requestBody = "";
    const request = async (_url: string | URL | Request, init?: RequestInit) => { requestBody = String(init?.body); return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ summary: "Visible balance is repeatable.", effective: ["Balanced setup"], priorityCorrection: "Keep the finish balanced.", secondaryObservations: ["Camera angle is usable"], drill: "Five standstills", nextCameraAngle: "Side view", confidence: "MEDIUM", limitations: ["Disc metrics are not measured."], safetyNote: "Stop if movement causes pain." }) }] }] }), { status: 200 }); };
    const result = await new OpenAIFrameAnalysisProvider("test-key", "gpt-5.6", request as typeof fetch).analyzeThrow({ frames: [{ dataUrl: "data:image/jpeg;base64,AA==", label: "setup" }, { dataUrl: "data:image/jpeg;base64,AA==", label: "release" }], context: { throwType: "BACKHAND" } });
    expect(result.confidence).toBe("MEDIUM"); expect(JSON.parse(requestBody).store).toBe(false);
  });
  it("rejects an unsafe number of frames before calling a provider", async () => { await expect(new OpenAIFrameAnalysisProvider("test").analyzeThrow({ frames: [], context: {} })).rejects.toThrow("2 to 8"); });
});
