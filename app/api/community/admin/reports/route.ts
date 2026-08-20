import { listOpenReports } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";

export async function GET() {
  try {
    const user = await requireCommunityActor();
    return Response.json({ reports: await listOpenReports(user) });
  } catch (error) { return communityErrorResponse(error); }
}
