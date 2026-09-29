// Today's date in the machine's local time zone, as YYYY-MM-DD.
// (toISOString() would use UTC, which is still "yesterday" in India before 5:30 AM.)
export function todayLocal(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA");
}
