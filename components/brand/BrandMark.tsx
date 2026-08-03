import Link from "next/link";
import Image from "next/image";
import { brand } from "@/config/brand";

type Props = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: Props) {
  return (
    <Link className="brand-mark" href="/" aria-label={brand.logo.accessibleLabel}>
      <span className="brand-symbol" aria-hidden="true">
        <Image src={brand.logo.mark} alt="" width={48} height={48} priority />
      </span>
      {!compact ? (
        <span className="brand-wordmark">{brand.logo.wordmark}</span>
      ) : null}
    </Link>
  );
}
