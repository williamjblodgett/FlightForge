import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <BrandMark />
          <p>The operating system for recreational and competitive disc golf.</p>
        </div>
        <div className="footer-links">
          <Link href="/courses">Discover courses</Link>
          <Link href="/roadmap">Product roadmap</Link>
          <Link href="/legal/privacy">Privacy placeholder</Link>
          <a href={`mailto:${brand.supportEmail}`}>Support</a>
        </div>
        <p className="footer-legal">
          {brand.productName} is a working title. Seed sources are attributed; no partnership with listed courses or directories is implied.
        </p>
      </div>
    </footer>
  );
}
