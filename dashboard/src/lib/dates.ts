// Dates from the API are "YYYY-MM-DD" strings. We compare them as local calendar days.

export function todayLocal(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA");
}

function toDate(isoDay: string): Date {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Whole days from today to the given day (negative = in the past)
export function daysFromToday(isoDay: string, today: string = todayLocal()): number {
  return Math.round((toDate(isoDay).getTime() - toDate(today).getTime()) / 86_400_000);
}

export type Urgency = "overdue" | "today" | "soon" | "later";

export function urgencyOf(isoDay: string): Urgency {
  const days = daysFromToday(isoDay);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 2) return "soon";
  return "later";
}

export function relativeDay(isoDay: string): string {
  const days = daysFromToday(isoDay);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days overdue`;
  if (days < 7) return `In ${days} days`;
  return toDate(isoDay).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function shortDate(isoDay: string): string {
  return toDate(isoDay).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}
