import { LoaderCircle } from "lucide-react";
import styles from "@/components/community/Community.module.css";

export default function MessagesLoading() {
  return <main className={styles.routeLoading} aria-busy="true"><LoaderCircle className={styles.spin} aria-hidden="true" /><strong>Opening your inbox…</strong></main>;
}
