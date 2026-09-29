import type { Task } from "../types";
import { DueLabel, EmptyState, PriorityBadge } from "./ui";

interface Props {
  pendingTasks: Task[];
  doneTasks: Task[];
}

const COLUMNS = [
  { key: "todo", title: "To do", dot: "bg-slate-400" },
  { key: "in_progress", title: "In progress", dot: "bg-sky-500" },
  { key: "done", title: "Done", dot: "bg-emerald-500" },
] as const;

const PRIORITY_BAR = { high: "bg-rose-500", medium: "bg-amber-500", low: "bg-slate-400" };

function TaskCard({ task }: { task: Task }) {
  const done = task.status === "done";
  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pl-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900/60">
      <span className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_BAR[task.priority]}`} />
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${done ? "text-slate-400 line-through dark:text-slate-500" : ""}`}>
          {task.title}
        </p>
        <span className="font-mono text-[11px] text-slate-400">#{task.id}</span>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
          {task.projectName}
        </span>
        <div className="flex items-center gap-2">
          {!done && task.dueDate && <DueLabel date={task.dueDate} />}
          {!done && <PriorityBadge priority={task.priority} />}
        </div>
      </div>
    </article>
  );
}

// Kanban board: one column per status
export function TaskBoard({ pendingTasks, doneTasks }: Props) {
  const recentDone = [...doneTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const byColumn = {
    todo: pendingTasks.filter((task) => task.status === "todo"),
    in_progress: pendingTasks.filter((task) => task.status === "in_progress"),
    done: recentDone,
  };

  return (
    <div className="board-scroll -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {COLUMNS.map((column) => (
        <section
          key={column.key}
          aria-label={column.title}
          className="w-[80vw] max-w-sm shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3 md:w-auto md:max-w-none dark:border-white/10 dark:bg-white/[0.02]"
        >
          <header className="mb-3 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className={`h-2 w-2 rounded-full ${column.dot}`} />
              {column.title}
            </h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">
              {byColumn[column.key].length}
            </span>
          </header>
          <div className="space-y-2">
            {byColumn[column.key].length === 0 ? (
              <EmptyState>{column.key === "done" ? "Nothing finished yet" : "Empty"}</EmptyState>
            ) : (
              byColumn[column.key].map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
