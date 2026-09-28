/** Wall-clock event times belong to the venue's time zone, never the browser's. */
export function eventLocalTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new RangeError("Enter a valid event date and time.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function eventTimeToIso(local: string, timeZone: string, originalIso?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(local)) throw new RangeError("Enter a valid event date and time.");
  const wallTime = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 16) !== local) {
    throw new RangeError("Enter a valid event date and time.");
  }
  // Preserve the known instant on unchanged edits, including a repeated DST hour.
  if (originalIso && eventLocalTime(originalIso, timeZone) === local) return originalIso;
  const candidates = new Set<string>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = wallTime + hours * 3_600_000;
    const offset = Date.parse(`${eventLocalTime(new Date(sample).toISOString(), timeZone)}:00Z`) - sample;
    const candidate = new Date(wallTime - offset).toISOString();
    if (eventLocalTime(candidate, timeZone) === local) candidates.add(candidate);
  }
  if (candidates.size === 0) throw new RangeError("That time does not exist because the clocks change. Choose a time outside the daylight-saving transition.");
  if (candidates.size > 1) throw new RangeError("That time occurs twice because the clocks change. Choose a time outside the repeated hour.");
  return [...candidates][0];
}
