import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { courses } from "@/modules/courses/demo-courses";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = `https://${brand.domain}`;
  const now = new Date();
  return ["", "/courses", "/events", "/places/new-england", "/roadmap", "/legal/privacy", "/legal/terms"].map((path) => ({ url: `${root}${path}`, lastModified: now }))
    .concat(courses.map((course) => ({ url: `${root}/courses/${course.slug}`, lastModified: new Date(course.lastReviewedAt) })));
}
