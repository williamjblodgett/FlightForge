import Link from "next/link";
import { BarChart3, Database, Film, Flag, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { brand } from "@/config/brand";

type Props = {
  active: "claims" | "imports" | "highlights" | "reports";
  children: React.ReactNode;
};

const adminLinks = [
  { key: "claims", label: "Claim review", href: "/admin/claims", icon: ShieldCheck },
  { key: "imports", label: "Import review", href: "/admin/imports", icon: Database },
  { key: "highlights", label: "Hole videos", href: "/admin/highlights", icon: Film },
  { key: "reports", label: "Community reports", href: "/admin/reports", icon: Flag },
] as const;

export function AdminShell({ active, children }: Props) {
  return (
    <main className="admin-page page-shell">
      <header className="admin-heading">
        <div><span className="eyebrow">Platform operations</span><h1>{brand.productName} administration</h1><p>Every decision requires a reason and creates an audit event.</p></div>
        <span className="admin-secure"><ShieldCheck aria-hidden="true" /> Protected surface</span>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav aria-label="Administrator sections">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return <Link key={item.key} className={active === item.key ? "is-active" : ""} href={item.href}><Icon aria-hidden="true" />{item.label}</Link>;
            })}
            <span aria-disabled="true"><Users aria-hidden="true" />User management <small>Later</small></span>
            <span aria-disabled="true"><SlidersHorizontal aria-hidden="true" />Feature flags <small>Later</small></span>
            <span aria-disabled="true"><BarChart3 aria-hidden="true" />Analytics <small>Later</small></span>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}
