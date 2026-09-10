import { getUnreadMessageCount } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
export async function GET(){
  try{const user=await requireCommunityActor();return Response.json({unreadCount:await getUnreadMessageCount(user)},{headers:{"Cache-Control":"private, no-store"}});}
  catch(error){const response=communityErrorResponse(error);response.headers.set("Cache-Control","private, no-store");return response;}
}
