import { brand } from "@/config/brand";
export function GET(request:Request){return Response.redirect(new URL(brand.favicon,request.url),308);}
