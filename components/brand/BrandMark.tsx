import Link from "next/link";
import { Disc3, Mountain } from "lucide-react";
import { brand } from "@/config/brand";

type Props = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: Props) {
  return (
    <Link className="brand-mark" href="/" aria-label={brand.logo.accessibleLabel}>
      <span className="brand-symbol" aria-hidden="true">
        <Mountain className="brand-mountain" />
        <Disc3 className="brand-disc" />
      </span>
      {!compact ? (
        <span className="brand-wordmark">
          Flight<span>Forge</span>
        </span>
      ) : null}
    </Link>
  );
}
