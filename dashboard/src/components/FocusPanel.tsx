import type { Application, Task } from "../types";
import { Card, DueLabel, EmptyState, PriorityBadge } from "./ui";
import { IconBell, IconSparkle, IconTarget } from "./icons";

interface Props {
  pendingTasks: Task[];
  followUps: Application[];
}

// "What should I do today?": the top of the (already sorted) pending list plus due follow-ups
export function FocusPanel({ pendingTasks, followUps }: Props) {
  const focus = pendingTasks.slice(0, 3);

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-300">
          <IconTarget />
        </span>
        <h2 className="text-base font-semibold tracking-tight">Today's focus</h2>
      </div>

      {focus.length === 0 ? (
        <EmptyState>No pending tasks. Ask Claude to add one, or enjoy the free time.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {focus.map((task, index) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.02]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {task.projectName}
                  {task.status === "in_progress" && " · in progress"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <PriorityBadge priority={task.priority} />
                {task.dueDate && <DueLabel date={task.dueDate} />}
              </div>
            </li>
          ))}
        </ol>
      )}

      {followUps.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
            <IconBell width={14} height={14} /> Follow-ups due
          </p>
          <ul className="space-y-1">
            {followUps.map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="font-medium">{application.company}</span>
                  <span className="text-slate-500 dark:text-slate-400"> · {application.role}</span>
                </span>
                {application.followUpDate && <DueLabel date={application.followUpDate} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <IconSparkle width={14} height={14} />
        Tip: ask Claude "Plan my day in DevHub" for a personal plan.
      </p>
    </Card>
  );
}
