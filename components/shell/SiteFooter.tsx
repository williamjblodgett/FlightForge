import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { publicContacts } from "@/config/public-launch";

export function SiteFooter() {
  const contacts = publicContacts();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <BrandMark />
          <p>The operating system for recreational and competitive disc golf.</p>
        </div>
        <div className="footer-links">
          <Link href="/courses">Discover courses</Link>
          <Link href="/roadmap">What’s coming</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/support/course-correction">Correct a course listing</Link>
          {contacts.supportEmail ? <a href={`mailto:${contacts.supportEmail}`}>Support</a> : <Link href="/support/course-correction">Support</Link>}
        </div>
        <p className="footer-legal">
          Course details can change. Confirm current access, fees, and conditions with the course before traveling. No partnership with listed courses or directories is implied.
        </p>
      </div>
    </footer>
  );
}
