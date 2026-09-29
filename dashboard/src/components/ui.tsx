import type { ReactNode } from "react";
import type { TaskPriority } from "../types";
import { relativeDay, urgencyOf } from "../lib/dates";
import { PriorityBars } from "./icons";

export function PageHeader({ title, meta, action }: { title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {meta && <p className="mt-1 font-mono text-xs text-dim">{meta}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.08em] text-dim uppercase">
      {children}
      {count !== undefined && <span className="text-ink/60 tabular-nums">{count}</span>}
    </h2>
  );
}

const PRIORITY_LEVEL: Record<TaskPriority, 1 | 2 | 3> = { low: 1, medium: 2, high: 3 };
const PRIORITY_COLOR: Record<TaskPriority, string> = { high: "text-bad", medium: "text-warn", low: "text-dim" };

export function Priority({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center ${PRIORITY_COLOR[priority]}`} title={`${priority} priority`}>
      <PriorityBars level={PRIORITY_LEVEL[priority]} />
      <span className="sr-only">{priority} priority</span>
    </span>
  );
}

const URGENCY_STYLES = {
  overdue: "text-bad font-medium",
  today: "text-warn font-medium",
  soon: "text-warn",
  later: "text-dim",
};

export function Due({ date, prefix = "" }: { date: string; prefix?: string }) {
  return (
    <span className={`font-mono text-xs whitespace-nowrap ${URGENCY_STYLES[urgencyOf(date)]}`} title={date}>
      {prefix && <span className="hidden sm:inline">{prefix}</span>}
      {relativeDay(date)}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-line px-1.5 py-px font-mono text-[11px] text-dim">
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-5 text-sm text-dim">{children}</p>;
}
