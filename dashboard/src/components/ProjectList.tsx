import type { Project, ProjectStatus, Task } from "../types";
import { Empty, TINT, tintFor, type Tint } from "./ui";
import { IconFolder, IconGithub } from "./icons";

const STATUS: Record<ProjectStatus, { label: string; tint: Tint }> = {
  planned: { label: "Planned", tint: "butter" },
  in_progress: { label: "In progress", tint: "sky" },
  on_hold: { label: "On hold", tint: "peach" },
  completed: { label: "Completed", tint: "mint" },
  archived: { label: "Archived", tint: "rose" },
};

interface Props {
  projects: Project[];
  pendingTasks: Task[];
  doneTasks: Task[];
}

// Each project gets its own pastel card; the colour stays the same everywhere for that project
export function ProjectList({ projects, pendingTasks, doneTasks }: Props) {
  if (projects.length === 0) {
    return <Empty>No projects yet. Ask Claude: "Add my portfolio project to DevHub".</Empty>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const open = pendingTasks.filter((t) => t.projectId === project.id).length;
        const done = doneTasks.filter((t) => t.projectId === project.id).length;
        const total = open + done;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);
        const tint = TINT[tintFor(project.name)];
        const status = STATUS[project.status];
        const github = project.githubUrl?.startsWith("https://") ? project.githubUrl : null;

        return (
          <article
            key={project.id}
            className={`flex flex-col rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 ${tint.bg}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className={`text-lg font-bold ${tint.ink}`}>{project.name}</h3>
              <span className={`shrink-0 rounded-full bg-panel/80 px-2.5 py-0.5 text-[11.5px] font-semibold ${TINT[status.tint].ink}`}>
                {status.label}
              </span>
            </div>
            {project.description && <p className="mt-1.5 text-sm text-ink/70">{project.description}</p>}

            <div className="mt-5">
              <div className={`flex items-baseline justify-between text-xs font-medium ${tint.ink}`}>
                <span>
                  {done} of {total} tasks done
                </span>
                <span className="text-2xl font-bold tabular-nums">{total === 0 ? "–" : `${percent}%`}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel/70">
                <div className={`h-full rounded-full transition-all duration-700 ${tint.bar}`} style={{ width: `${percent}%` }} />
              </div>
            </div>

            {project.techStack.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <span key={tech} className="rounded-full bg-panel/80 px-2.5 py-0.5 text-[11.5px] font-medium text-ink/75">
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {(github || project.path) && (
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-xs text-ink/60">
                {github && (
                  <a href={github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-ink">
                    <IconGithub width={14} height={14} /> {github.replace("https://github.com/", "")}
                  </a>
                )}
                {project.path && (
                  <span className="inline-flex min-w-0 items-center gap-1 font-mono" title={project.path}>
                    <IconFolder width={14} height={14} className="shrink-0" />
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
