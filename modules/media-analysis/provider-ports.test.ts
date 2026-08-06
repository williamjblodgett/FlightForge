import { describe, expect, it, vi } from "vitest";
import { HttpMalwareScanner } from "./provider-ports";

describe("HttpMalwareScanner", () => {
  it("sends bytes only to an authenticated HTTPS scanner and validates its verdict", async () => {
    let captured: RequestInit | undefined;
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = init;
      return new Response(JSON.stringify({ clean: true, engine: "scanner", signatureVersion: "2026-08-06", threats: [] }), { status: 200 });
    });
    const scanner = new HttpMalwareScanner("https://scanner.example/scan", "secret", request as typeof fetch);
    await expect(scanner.scan({ bytes: new Uint8Array([1, 2, 3]), mimeType: "video/mp4", fileName: "throw.mp4" })).resolves.toMatchObject({ clean: true });
    expect(captured).toMatchObject({ headers: { Authorization: "Bearer secret", "Content-Type": "video/mp4" } });
  });

  it("rejects insecure endpoints and malformed verdicts", async () => {
    const insecure = new HttpMalwareScanner("http://scanner.example/scan", "secret");
    await expect(insecure.scan({ bytes: new Uint8Array(), mimeType: "video/mp4", fileName: "throw.mp4" })).rejects.toThrow("secured");
    const malformed = new HttpMalwareScanner("https://scanner.example/scan", "secret", async () => new Response("{}") as never);
    await expect(malformed.scan({ bytes: new Uint8Array(), mimeType: "video/mp4", fileName: "throw.mp4" })).rejects.toThrow("invalid verdict");
  });
});
