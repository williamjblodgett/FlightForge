"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & { match?: string };

export function NavLink({ match, className, ...props }: Props) {
  const pathname = usePathname();
  const target = match ?? (typeof props.href === "string" ? props.href.split("#")[0] : "");
  const active = target === "/" ? pathname === "/" : Boolean(target && pathname.startsWith(target));
  return <Link {...props} className={`${className ?? ""}${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} />;
}
