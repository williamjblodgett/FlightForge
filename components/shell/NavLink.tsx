"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & { match?: string | string[] };

export function NavLink({ match, className, ...props }: Props) {
  const pathname = usePathname();
  const href = typeof props.href === "string" ? props.href : "";
  const targets = Array.isArray(match) ? match : [match ?? href];
  const active = targets.some((target) => {
    if (!target || target.includes("#")) return false;
    return target === "/" ? pathname === "/" : pathname.startsWith(target);
  });
  return <Link {...props} className={`${className ?? ""}${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} />;
}
