import { getD1Database } from "./runtime";

/** A failing CHECK aborts the entire D1 batch when a read precondition changed. */
export function transactionGuard(condition: string, values: Array<string | number | null>): D1PreparedStatement[] {
  const db = getD1Database(), id = crypto.randomUUID();
  return [db.prepare(`INSERT INTO player_tool_guards(id,valid) VALUES(?,CASE WHEN ${condition} THEN 1 ELSE 0 END)`).bind(id,...values),
    db.prepare("DELETE FROM player_tool_guards WHERE id=?").bind(id)];
}
