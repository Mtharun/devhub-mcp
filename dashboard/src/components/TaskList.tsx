import { useState } from "react";
import type { Task, TaskStatus } from "../types";
import { Card, Due, Empty, Priority, SectionLabel, Tag, tintFor } from "./ui";
import { IconSearch, StatusDone, StatusProgress, StatusTodo } from "./icons";

const STATUS_ICON: Record<Exclude<TaskStatus, "archived">, { icon: typeof StatusTodo; color: string }> = {
  todo: { icon: StatusTodo, color: "text-dim" },
  in_progress: { icon: StatusProgress, color: "text-sky-ink" },
  done: { icon: StatusDone, color: "text-mint-ink" },
};

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const status = STATUS_ICON[task.status === "archived" ? "done" : task.status];
  const Icon = status.icon;
  const done = task.status === "done";

  return (
    <li className="group flex items-center gap-3 px-5 py-3 transition hover:bg-canvas">
      <span className={`shrink-0 ${status.color}`} title={task.status.replace("_", " ")}>
        <Icon />
      </span>
      <span className="hidden w-9 shrink-0 font-mono text-xs text-dim/80 tabular-nums sm:inline">#{task.id}</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? "text-dim line-through decoration-dim/50" : ""}`}>{task.title}</p>
        {task.description && <p className="truncate text-xs text-dim">{task.description}</p>}
      </div>
      {showProject && (
        <span className="hidden sm:inline-flex">
          <Tag tint={tintFor(task.projectName)}>{task.projectName}</Tag>
        </span>
      )}
      <span className="shrink-0 text-right sm:w-24">{!done && task.dueDate ? <Due date={task.dueDate} /> : null}</span>
      <span className="hidden w-16 shrink-0 text-right sm:inline">{!done && <Priority priority={task.priority} />}</span>
    </li>
  );
}

interface Props {
  pendingTasks: Task[];
  doneTasks: Task[];
}

// Issue-tracker style: grouped rows, with a search box and project filter chips
export function TaskList({ pendingTasks, doneTasks }: Props) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<string | null>(null);

  const projectNames = [...new Set([...pendingTasks, ...doneTasks].map((t) => t.projectName))].sort();
  const needle = query.trim().toLowerCase();
  const matches = (task: Task) =>
    (project === null || task.projectName === project) &&
    (needle === "" ||
      task.title.toLowerCase().includes(needle) ||
      (task.description ?? "").toLowerCase().includes(needle) ||
      `#${task.id}` === needle);

  const groups = [
    { key: "in_progress", label: "In progress", tasks: pendingTasks.filter((t) => t.status === "in_progress" && matches(t)) },
    { key: "todo", label: "To do", tasks: pendingTasks.filter((t) => t.status === "todo" && matches(t)) },
    {
      key: "done",
      label: "Recently done",
      tasks: [...doneTasks]
        .filter(matches)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
    },
  ];
  const filtering = needle !== "" || project !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-72">
          <span className="sr-only">Search tasks</span>
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-dim" width={16} height={16} />
          <input
            id="task-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks or #id"
            className="w-full rounded-full border border-line bg-panel py-2.5 pr-4 pl-10 text-sm outline-none placeholder:text-dim focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by project">
          {[null, ...projectNames].map((name) => (
            <button
              key={name ?? "all"}
              type="button"
              onClick={() => setProject(name)}
              aria-pressed={project === name}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                project === name
                  ? "border-transparent bg-lav text-lav-ink"
                  : "border-line bg-panel text-dim hover:text-ink"
              }`}
            >
              {name ?? "all projects"}
            </button>
          ))}
        </div>
      </div>

      {filtering && groups.every((group) => group.tasks.length === 0) && (
        <div className="rounded-3xl border border-dashed border-line bg-panel">
          <Empty>No tasks match{query ? ` "${query}"` : ""}{project ? ` in ${project}` : ""}.</Empty>
        </div>
      )}

      {groups
        .filter((group) => !filtering || group.tasks.length > 0)
        .map((group) => (
        <section key={group.key} className="space-y-2">
          <SectionLabel count={group.tasks.length}>{group.label}</SectionLabel>
          <Card className="overflow-hidden">
            {group.tasks.length === 0 ? (
              <Empty>{group.key === "done" ? "Nothing finished yet." : "No tasks here."}</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            )}
          </Card>
        </section>
      ))}
    </div>
  );
}
