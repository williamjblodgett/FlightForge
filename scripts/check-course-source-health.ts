import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type CandidateBatch = { records: Array<{ discovery_source_url: string }> };
type MaineBatch = { records: Array<{ source_url: string; secondary_source_url?: string | null }> };
type OverrideBatch = { records: Array<{ source_url: string }> };
type RegionalBatch = { records: Array<{ source_url: string }> };

const root = resolve(process.cwd());
const candidates = await readJson<CandidateBatch>(resolve(root, process.argv[2] ?? "work/new-england-directory-candidates.json"));
const maine = await readJson<MaineBatch>(resolve(root, "data/import/maine-courses.statewide.json"));
const overrides = await readJson<OverrideBatch>(resolve(root, "data/import/maine-course-authoritative-overrides.json"));
const regional = await readJson<RegionalBatch>(resolve(root, "data/import/new-england-courses.authoritative.json"));
const outputPath = resolve(root, process.argv[3] ?? "work/course-source-health.json");

const urls = [...new Set([
  ...candidates.records.map((record) => record.discovery_source_url),
  ...maine.records.flatMap((record) => [record.source_url, record.secondary_source_url]).filter(Boolean),
  ...overrides.records.map((record) => record.source_url),
  ...regional.records.map((record) => record.source_url),
] as string[])].sort();

const checkedAt = new Date().toISOString();
const records: SourceHealth[] = new Array(urls.length);
let cursor = 0;
const workers = Array.from({ length: Math.min(10, urls.length) }, async () => {
  while (cursor < urls.length) {
    const index = cursor++;
    records[index] = await check(urls[index], checkedAt);
  }
});
await Promise.all(workers);

await writeFile(outputPath, `${JSON.stringify({
  format_version: "1.0",
  generated_at: checkedAt,
  policy: "Reachability confirms only that a cited page responded. It does not independently prove same-day course access or every fact on the page.",
  counts: {
    urls: records.length,
    reachable: records.filter((record) => record.reachable).length,
    unavailable: records.filter((record) => !record.reachable).length,
  },
  records,
}, null, 2)}\n`, "utf8");
console.log(`Checked ${records.length} source URLs: ${records.filter((record) => record.reachable).length} reachable, ${records.filter((record) => !record.reachable).length} need review.`);

type SourceHealth = {
  url: string;
  checked_at: string;
  reachable: boolean;
  http_status: number | null;
  final_url: string | null;
  outcome: "REACHABLE" | "HTTP_ERROR" | "TIMEOUT" | "NETWORK_ERROR";
};

async function check(url: string, checkedAt: string): Promise<SourceHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "FlightForgeEvidenceAudit/1.0 (+https://github.com/williamjblodgett/FlightForge)" },
    });
    await response.body?.cancel();
    return {
      url,
      checked_at: checkedAt,
      reachable: response.status >= 200 && response.status < 400,
      http_status: response.status,
      final_url: response.url,
      outcome: response.status >= 200 && response.status < 400 ? "REACHABLE" : "HTTP_ERROR",
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      url,
      checked_at: checkedAt,
      reachable: false,
      http_status: null,
      final_url: null,
      outcome: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/u, "")) as T;
}
