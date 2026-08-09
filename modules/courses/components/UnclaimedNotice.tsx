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
        <strong>This course has not joined FlightForge yet.</strong>
        {!compact ? (
          <p>
            Some details may be limited until the course team takes over the page. Are you authorized to manage this course?{" "}
            <Link href={`/courses/${courseSlug}/claim`}>Claim this course</Link>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
