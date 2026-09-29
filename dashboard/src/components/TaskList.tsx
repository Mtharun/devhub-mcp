import type { Task, TaskStatus } from "../types";
import { Due, Empty, Priority, SectionLabel, Tag } from "./ui";
import { StatusDone, StatusProgress, StatusTodo } from "./icons";

const STATUS_ICON: Record<Exclude<TaskStatus, "archived">, { icon: typeof StatusTodo; color: string }> = {
  todo: { icon: StatusTodo, color: "text-dim" },
  in_progress: { icon: StatusProgress, color: "text-accent" },
  done: { icon: StatusDone, color: "text-good" },
};

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const status = STATUS_ICON[task.status === "archived" ? "done" : task.status];
  const Icon = status.icon;
  const done = task.status === "done";

  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-canvas/70">
      <span className={`shrink-0 ${status.color}`} title={task.status.replace("_", " ")}>
        <Icon />
      </span>
      <span className="hidden w-10 shrink-0 font-mono text-xs text-dim tabular-nums sm:inline">#{task.id}</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${done ? "text-dim line-through decoration-dim/50" : ""}`}>{task.title}</p>
        {task.description && <p className="truncate text-xs text-dim">{task.description}</p>}
      </div>
      {showProject && (
        <span className="hidden sm:inline-flex">
          <Tag>{task.projectName}</Tag>
        </span>
      )}
      <span className="shrink-0 text-right sm:w-24">{!done && task.dueDate ? <Due date={task.dueDate} /> : null}</span>
      <span className="w-4 shrink-0">{!done && <Priority priority={task.priority} />}</span>
    </li>
  );
}

interface Props {
  pendingTasks: Task[];
  doneTasks: Task[];
}

// Issue-tracker style: grouped rows instead of Kanban columns
export function TaskList({ pendingTasks, doneTasks }: Props) {
  const groups = [
    { key: "in_progress", label: "In progress", tasks: pendingTasks.filter((t) => t.status === "in_progress") },
    { key: "todo", label: "To do", tasks: pendingTasks.filter((t) => t.status === "todo") },
    {
      key: "done",
      label: "Recently done",
      tasks: [...doneTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <SectionLabel count={group.tasks.length}>{group.label}</SectionLabel>
          <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
            {group.tasks.length === 0 ? (
              <Empty>{group.key === "done" ? "Nothing finished yet." : "No tasks here."}</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
