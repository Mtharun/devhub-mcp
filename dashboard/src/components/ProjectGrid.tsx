import type { Project, ProjectStatus, Task } from "../types";
import { Card, Chip, EmptyState } from "./ui";
import { IconFolder, IconGithub } from "./icons";

const STATUS_STYLES: Record<ProjectStatus, { label: string; dot: string; text: string }> = {
  planned: { label: "Planned", dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-300" },
  in_progress: { label: "In progress", dot: "bg-sky-500 animate-pulse", text: "text-sky-700 dark:text-sky-300" },
  on_hold: { label: "On hold", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  archived: { label: "Archived", dot: "bg-slate-300", text: "text-slate-500" },
};

interface Props {
  projects: Project[];
  pendingTasks: Task[];
  doneTasks: Task[];
}

// Progress ring drawn with SVG: share of a project's tasks that are done
function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : done / total;

  return (
    <div className="relative h-12 w-12 shrink-0" title={`${done} of ${total} tasks done`}>
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-white/10" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="stroke-indigo-500 transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {total === 0 ? "–" : `${Math.round(ratio * 100)}%`}
      </span>
    </div>
  );
}

export function ProjectGrid({ projects, pendingTasks, doneTasks }: Props) {
  if (projects.length === 0) {
    return <EmptyState>No projects yet. Ask Claude: "Add my portfolio project to DevHub".</EmptyState>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const pending = pendingTasks.filter((task) => task.projectId === project.id).length;
        const done = doneTasks.filter((task) => task.projectId === project.id).length;
        const status = STATUS_STYLES[project.status];
        const githubUrl = project.githubUrl?.startsWith("https://") ? project.githubUrl : null;

        return (
          <Card key={project.id} className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-4">
              <ProgressRing done={done} total={done + pending} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{project.name}</h3>
                <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                  {status.label}
                  <span className="text-slate-400">· {pending} open</span>
                </p>
              </div>
            </div>

            {project.description && (
              <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
            )}

            {project.techStack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <Chip key={tech}>{tech}</Chip>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-slate-500 dark:text-slate-400">
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:text-indigo-500"
                >
                  <IconGithub width={14} height={14} /> GitHub
                </a>
              )}
              {project.path && (
                <span className="inline-flex min-w-0 items-center gap-1 font-mono" title={project.path}>
                  <IconFolder width={14} height={14} className="shrink-0" />
                  <span className="truncate">{project.path}</span>
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
