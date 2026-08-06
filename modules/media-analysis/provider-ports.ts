export type MalwareScanResult = { clean: boolean; engine: string; signatureVersion: string; threats: string[] };
export interface MalwareScanner { scan(input: { bytes: Uint8Array; mimeType: string; fileName: string }): Promise<MalwareScanResult>; }
export interface VideoTranscoder { submit(input: { storageKey: string; targetContainer: "MP4"; maximumHeight: 1080 }): Promise<{ jobId: string }>; status(jobId: string): Promise<{ status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"; safeStorageKey?: string }>; }

export class HttpMalwareScanner implements MalwareScanner {
  constructor(private readonly endpoint: string, private readonly token: string, private readonly request: typeof fetch = fetch) {}
  async scan(input: { bytes: Uint8Array; mimeType: string; fileName: string }): Promise<MalwareScanResult> {
    if (!this.endpoint.startsWith("https://") || !this.token) throw new Error("A secured malware scanner endpoint is required.");
    const body = new Uint8Array(input.bytes).buffer;
    const response = await this.request(this.endpoint, { method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": input.mimeType, "X-File-Name": encodeURIComponent(input.fileName) }, body });
    if (!response.ok) throw new Error("Malware scanner did not return a successful verdict.");
    const result = await response.json();
    if (!isScanResult(result)) throw new Error("Malware scanner returned an invalid verdict.");
    return result;
  }
}
function isScanResult(value: unknown): value is MalwareScanResult { if (!value || typeof value !== "object") return false; const item = value as Record<string, unknown>; return typeof item.clean === "boolean" && typeof item.engine === "string" && typeof item.signatureVersion === "string" && Array.isArray(item.threats) && item.threats.every((threat) => typeof threat === "string"); }
