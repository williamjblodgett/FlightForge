import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const states = [
  { code: "ME", place: "maine-united-states" },
  { code: "MA", place: "massachusetts-united-states" },
  { code: "NH", place: "new-hampshire-united-states" },
  { code: "VT", place: "vermont-united-states" },
  { code: "CT", place: "connecticut-united-states" },
  { code: "RI", place: "rhode-island-united-states" },
] as const;
const maximumPages = Number(process.argv[2] ?? 8);
const outputPath = resolve(process.argv[3] ?? "work/new-england-directory-candidates.json");
const checkedAt = new Date().toISOString();
const tasks = states.flatMap((state) => Array.from({ length: maximumPages }, (_, index) => ({ state, page: index + 1 })));
const pages = new Array<{ state: typeof states[number]; page: number; html: string }>(tasks.length);
let cursor = 0;

await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < tasks.length) {
    const index = cursor++;
    const task = tasks[index];
    const url = `https://udisc.com/courses?page=${task.page}&placeId=${task.state.place}`;
    pages[index] = { ...task, html: await fetchPage(url) };
  }
}));

const records = pages.flatMap(({ state, html }) => extractCards(html, state.code));
const deduplicated = [...new Map(records.map((record) => [record.candidate_id, record])).values()]
  .sort((left, right) => left.state.localeCompare(right.state) || left.name.localeCompare(right.name));
const counts = Object.fromEntries(states.map((state) => [state.code, deduplicated.filter((record) => record.state === state.code).length]));

await writeFile(outputPath, `${JSON.stringify({
  format_version: "1.0",
  generated_at: checkedAt,
  source_policy: "Directory records are discovery candidates only. They remain unpublished until a current owner, facility, municipal, park, school, or university source confirms identity and location.",
  availability_policy: "A source-supported course listing is not an open-now guarantee. Players must check the linked operator or facility source before travel.",
  counts,
  records: deduplicated,
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, total: deduplicated.length, counts }, null, 2));

async function fetchPage(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "FlightForgeCourseResearch/1.0 (+https://github.com/williamjblodgett/FlightForge)" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === 2) throw new Error(`Could not fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Could not fetch ${url}`);
}

function extractCards(html: string, state: string) {
  const records = [];
  const pattern = /<li[^>]*>[\s\S]*?<a[^>]+href="(\/courses\/[^"/?]+)"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/li>/giu;
  for (const match of html.matchAll(pattern)) {
    const path = match[1];
    const name = clean(match[2] ?? "");
    const location = clean(match[3] ?? "");
    if (!path || !name || path === "/courses/add") continue;
    records.push({
      candidate_id: `udisc:${path.split("/").at(-1)}`,
      slug: slugify(name),
      name,
      city: location.split(",")[0]?.trim() || "Unknown",
      state,
      country_code: "US",
      discovery_source_name: "UDisc course directory",
      discovery_source_url: `https://udisc.com${path}`,
      discovery_checked_at: checkedAt,
      primary_source_status: "REVIEW_REQUIRED",
      publication_status: "WITHHELD_PENDING_PRIMARY_SOURCE",
    });
  }
  return records;
}

function clean(value: string): string {
  return value.replace(/<[^>]+>/gu, " ").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replace(/\s+/gu, " ").trim();
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
