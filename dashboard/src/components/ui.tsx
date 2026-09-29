import type { ReactNode } from "react";
import type { TaskPriority } from "../types";
import { relativeDay, urgencyOf } from "../lib/dates";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {hint && <span className="hidden text-xs sm:inline text-slate-500 dark:text-slate-400">{hint}</span>}
    </div>
  );
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-300",
  medium: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  low: "bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-300",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

const URGENCY_STYLES = {
  overdue: "text-rose-600 dark:text-rose-400 font-semibold",
  today: "text-amber-600 dark:text-amber-400 font-semibold",
  soon: "text-amber-600 dark:text-amber-400",
  later: "text-slate-500 dark:text-slate-400",
};

// "Tomorrow", "3 days overdue", "12 Oct" with a colour that shows urgency
export function DueLabel({ date, prefix = "" }: { date: string; prefix?: string }) {
  return (
    <span className={`text-xs ${URGENCY_STYLES[urgencyOf(date)]}`} title={date}>
      {prefix}
      {relativeDay(date)}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      {children}
    </p>
  );
}
