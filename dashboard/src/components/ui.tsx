import type { ReactNode } from "react";
import type { TaskPriority } from "../types";
import { relativeDay, urgencyOf } from "../lib/dates";

export type Tint = "lav" | "sky" | "mint" | "peach" | "butter" | "rose";

// Tailwind needs full class names in the source, so each tint is spelled out
export const TINT: Record<Tint, { bg: string; ink: string; bar: string }> = {
  lav: { bg: "bg-lav", ink: "text-lav-ink", bar: "bg-lav-ink" },
  sky: { bg: "bg-sky", ink: "text-sky-ink", bar: "bg-sky-ink" },
  mint: { bg: "bg-mint", ink: "text-mint-ink", bar: "bg-mint-ink" },
  peach: { bg: "bg-peach", ink: "text-peach-ink", bar: "bg-peach-ink" },
  butter: { bg: "bg-butter", ink: "text-butter-ink", bar: "bg-butter-ink" },
  rose: { bg: "bg-rose", ink: "text-rose-ink", bar: "bg-rose-ink" },
};

export function PageHeader({ title, meta, action }: { title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {meta && <p className="mt-1 text-sm text-dim">{meta}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-bold">
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-dim tabular-nums">{count}</span>
      )}
    </h2>
  );
}

const PRIORITY_TINT: Record<TaskPriority, Tint> = { high: "rose", medium: "butter", low: "mint" };

export function Priority({ priority }: { priority: TaskPriority }) {
  const tint = TINT[PRIORITY_TINT[priority]];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize ${tint.bg} ${tint.ink}`}>
      {priority}
    </span>
  );
}

const URGENCY_STYLES = {
  overdue: "text-rose-ink font-semibold",
  today: "text-peach-ink font-semibold",
  soon: "text-peach-ink",
  later: "text-dim",
};

export function Due({ date, prefix = "" }: { date: string; prefix?: string }) {
  return (
    <span className={`text-xs whitespace-nowrap ${URGENCY_STYLES[urgencyOf(date)]}`} title={date}>
      {prefix && <span className="hidden sm:inline">{prefix}</span>}
      {relativeDay(date)}
    </span>
  );
}

export function Tag({ children, tint = "sky" }: { children: ReactNode; tint?: Tint }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${TINT[tint].bg} ${TINT[tint].ink}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-dim">{children}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.03)] ${className}`}>{children}</div>;
}

// A stable pastel for any project name, so a project keeps its colour everywhere
const PROJECT_TINTS: Tint[] = ["lav", "sky", "mint", "peach", "butter", "rose"];
export function tintFor(name: string): Tint {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PROJECT_TINTS[hash % PROJECT_TINTS.length];
}
