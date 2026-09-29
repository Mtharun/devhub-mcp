import type { Project, ProjectStatus, Task } from "../types";
import { Empty, Tag } from "./ui";
import { IconFolder, IconGithub } from "./icons";

const STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  planned: { label: "planned", color: "text-dim" },
  in_progress: { label: "in progress", color: "text-accent" },
  on_hold: { label: "on hold", color: "text-warn" },
  completed: { label: "completed", color: "text-good" },
  archived: { label: "archived", color: "text-dim" },
};

interface Props {
  projects: Project[];
  pendingTasks: Task[];
  doneTasks: Task[];
}

export function ProjectList({ projects, pendingTasks, doneTasks }: Props) {
  if (projects.length === 0) {
    return <Empty>No projects yet. Ask Claude: "Add my portfolio project to DevHub".</Empty>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {projects.map((project) => {
        const open = pendingTasks.filter((t) => t.projectId === project.id).length;
        const done = doneTasks.filter((t) => t.projectId === project.id).length;
        const total = open + done;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);
        const status = STATUS[project.status];
        const github = project.githubUrl?.startsWith("https://") ? project.githubUrl : null;

        return (
          <article key={project.id} className="flex flex-col rounded-lg border border-line bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate font-mono text-[15px] font-semibold">{project.name}</h3>
              <span className={`shrink-0 font-mono text-xs ${status.color}`}>● {status.label}</span>
            </div>
            {project.description && <p className="mt-1.5 text-sm text-dim">{project.description}</p>}

            <div className="mt-4">
              <div className="flex justify-between font-mono text-[11px] text-dim">
                <span>
                  {done}/{total} tasks done
                </span>
                <span className="tabular-nums">{total === 0 ? "no tasks" : `${percent}%`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${percent}%` }} />
              </div>
            </div>

            {project.techStack.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <Tag key={tech}>{tech}</Tag>
                ))}
              </div>
            )}

            {(github || project.path) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[11px] text-dim">
                {github && (
                  <a href={github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
                    <IconGithub width={13} height={13} /> {github.replace("https://github.com/", "")}
                  </a>
                )}
                {project.path && (
                  <span className="inline-flex min-w-0 items-center gap-1" title={project.path}>
                    <IconFolder width={13} height={13} className="shrink-0" />
                    <span className="truncate">{project.path}</span>
                  </span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
