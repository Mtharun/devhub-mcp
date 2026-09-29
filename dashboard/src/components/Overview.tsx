import type { Application, Project, Task } from "../types";
import { greeting } from "../lib/dates";
import { TaskRow } from "./TaskList";
import { ApplicationRow } from "./JobTracker";
import { Empty, SectionLabel } from "./ui";

interface Props {
  projects: Project[];
  pendingTasks: Task[];
  doneTasks: Task[];
  applications: Application[];
  followUps: Application[];
  onOpenTasks: () => void;
}

const PROMPTS = [
  "Plan my day in DevHub. I have 3 hours.",
  "In DevHub, I finished task #4.",
  "I applied to <company> for <role> on LinkedIn.",
  "Find TODOs in portfolio-website.",
];

export function Overview({ projects, pendingTasks, doneTasks, applications, followUps, onOpenTasks }: Props) {
  const upNext = pendingTasks.slice(0, 4);
  const interviewing = applications.filter((a) => a.status === "interviewing").length;

  const metrics = [
    { label: "open tasks", value: pendingTasks.length, note: `${pendingTasks.filter((t) => t.priority === "high").length} high` },
    { label: "in progress", value: pendingTasks.filter((t) => t.status === "in_progress").length, note: "started" },
    { label: "done", value: doneTasks.length, note: "all time" },
    { label: "applications", value: applications.filter((a) => ["wishlist", "applied", "interviewing", "offer"].includes(a.status)).length, note: `${interviewing} interviewing` },
    { label: "projects", value: projects.length, note: "active" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs text-dim">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting()}, Tharun.</h1>
        <p className="mt-1 text-dim">
          {pendingTasks.length === 0
            ? "Nothing pending. A good moment to plan the next project."
            : `${pendingTasks.length} open task${pendingTasks.length === 1 ? "" : "s"}${
                followUps.length > 0 ? ` and ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due` : ""
              }.`}
        </p>
      </div>

      {/* Metrics as one strip, not a row of cards */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-panel sm:grid-cols-5">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`px-4 py-3 ${index > 0 ? "border-line sm:border-l" : ""} ${index % 2 === 1 ? "border-l sm:border-l" : ""} ${
              index >= 2 ? "border-t sm:border-t-0" : ""
            } ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <dt className="font-mono text-[11px] tracking-[0.06em] text-dim uppercase">{metric.label}</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{metric.value}</span>
              <span className="text-xs text-dim">{metric.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          {followUps.length > 0 && (
            <section className="space-y-2">
              <SectionLabel count={followUps.length}>Follow-ups due</SectionLabel>
              <div className="overflow-hidden rounded-lg border border-bad/40 bg-panel">
                <ul className="divide-y divide-line">
                  {followUps.map((application) => (
                    <ApplicationRow key={application.id} application={application} />
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Up next</SectionLabel>
              {pendingTasks.length > upNext.length && (
                <button type="button" onClick={onOpenTasks} className="font-mono text-xs text-accent hover:underline">
                  all {pendingTasks.length} tasks →
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-panel">
              {upNext.length === 0 ? (
                <Empty>No open tasks. Ask Claude to add one.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {upNext.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </div>
            <p className="font-mono text-[11px] text-dim">sorted by priority, then due date</p>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="space-y-2">
            <SectionLabel>Projects</SectionLabel>
            <ul className="space-y-3">
              {projects.map((project) => {
                const open = pendingTasks.filter((t) => t.projectId === project.id).length;
                const done = doneTasks.filter((t) => t.projectId === project.id).length;
                const percent = open + done === 0 ? 0 : Math.round((done / (open + done)) * 100);
                return (
                  <li key={project.id}>
                    <div className="flex justify-between gap-2 font-mono text-xs">
                      <span className="truncate">{project.name}</span>
                      <span className="text-dim tabular-nums">{percent}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-2">
            <SectionLabel>Ask Claude</SectionLabel>
            <ul className="space-y-1.5 rounded-lg border border-dashed border-line p-3">
              {PROMPTS.map((prompt) => (
                <li key={prompt} className="font-mono text-[11.5px] leading-relaxed text-dim">
                  <span className="text-accent">›</span> {prompt}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
