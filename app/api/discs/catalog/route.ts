import { listCatalogDiscs } from "@/modules/bags/bag-repository";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const discs = await listCatalogDiscs(query).catch(() => []);
  return Response.json({ discs });
}
