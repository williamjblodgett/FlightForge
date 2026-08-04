import Link from "next/link";
import { brand } from "@/config/brand";

type Props = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: Props) {
  return (
    <Link className="brand-mark" href="/" aria-label={brand.logo.accessibleLabel}>
      <span className="brand-symbol" aria-hidden="true">
        {/* The small local mark bypasses image optimization so the header never depends on an image-worker binding. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo.mark} alt="" width="48" height="48" />
      </span>
      {!compact ? (
        <span className="brand-wordmark">{brand.logo.wordmark}</span>
      ) : null}
    </Link>
  );
}
