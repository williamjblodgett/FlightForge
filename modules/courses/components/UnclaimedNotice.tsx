import Link from "next/link";
import { BadgeInfo } from "lucide-react";

type Props = {
  courseSlug: string;
  compact?: boolean;
};

export function UnclaimedNotice({ courseSlug, compact = false }: Props) {
  return (
    <div className={`unclaimed-notice${compact ? " unclaimed-compact" : ""}`}>
      <BadgeInfo aria-hidden="true" />
      <div>
        <strong>This listing has not yet been claimed or verified by the course operator.</strong>
        {!compact ? (
          <p>
            Facts are source-attributed and intentionally limited. Are you authorized to manage this course?{" "}
            <Link href={`/courses/${courseSlug}/claim`}>Start a verified claim</Link>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
