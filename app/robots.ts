import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/account/", "/api/", "/onboarding", "/profile", "/favorites", "/bag", "/coach", "/play"] }, sitemap: `https://${brand.domain}/sitemap.xml` };
}
