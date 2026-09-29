import { useState } from "react";
import type { Application, Project, Task } from "../types";
import { greeting, relativeDay, todayLocal } from "../lib/dates";
import { TaskRow } from "./TaskList";
import { ApplicationRow } from "./JobTracker";
import { Empty, Priority, SectionLabel } from "./ui";

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
  "In DevHub, I finished task #",
  "In DevHub, I applied to [company] for [role] on LinkedIn.",
  "Which job follow-ups are due in DevHub?",
  "Find TODOs in devhub-mcp.",
];

// Tasks finished on each of the last 7 days, from the done tasks' last update time
function weeklyActivity(doneTasks: Task[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return { key: todayLocal(date), label: date.toLocaleDateString(undefined, { weekday: "narrow" }), count: 0 };
  });
  for (const task of doneTasks) {
    const day = days.find((d) => d.key === todayLocal(new Date(task.updatedAt)));
    if (day) day.count++;
  }
  return days;
}

function ActivityChart({ doneTasks }: { doneTasks: Task[] }) {
  const days = weeklyActivity(doneTasks);
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Done this week</SectionLabel>
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
      </div>
      <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label={`${total} tasks finished in the last 7 days`}>
        {days.map((day, index) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-[10px] text-dim tabular-nums">{day.count > 0 ? day.count : ""}</span>
            <div
              className={`w-full rounded-md transition-all duration-700 ${
                index === 6 ? "bg-accent" : day.count > 0 ? "bg-ink" : "bg-sunken"
              }`}
              style={{ height: `${Math.max(6, (day.count / max) * 64)}px` }}
              title={`${day.key}: ${day.count} done`}
            />
            <span className={`font-mono text-[10px] ${index === 6 ? "font-semibold text-accent-text" : "text-dim"}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromptList() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (prompt: string) => {
    navigator.clipboard
      ?.writeText(prompt)
      .then(() => {
        setCopied(prompt);
        window.setTimeout(() => setCopied((current) => (current === prompt ? null : current)), 1600);
      })
      .catch(() => setCopied(null));
  };

  return (
    <section className="space-y-2">
      <SectionLabel>Ask Claude</SectionLabel>
      <ul className="space-y-1.5">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => copy(prompt)}
              className="group flex w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-left font-mono text-[11.5px] text-dim transition hover:-translate-y-px hover:border-ink/30 hover:text-ink hover:shadow-sm"
            >
              <span className="text-accent-text">›</span>
              <span className="min-w-0 flex-1">{prompt}</span>
              <span className={`shrink-0 text-[10px] ${copied === prompt ? "text-good" : "text-dim/0 group-hover:text-dim"}`}>
                {copied === prompt ? "copied ✓" : "copy"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Overview({ projects, pendingTasks, doneTasks, applications, followUps, onOpenTasks }: Props) {
  const [next, ...rest] = pendingTasks;
  const upNext = rest.slice(0, 4);
  const highCount = pendingTasks.filter((t) => t.priority === "high").length;
  const inProgress = pendingTasks.filter((t) => t.status === "in_progress").length;
  const activeApps = applications.filter((a) => ["wishlist", "applied", "interviewing", "offer"].includes(a.status));
  const doneShare = pendingTasks.length + doneTasks.length === 0 ? 0 : doneTasks.length / (pendingTasks.length + doneTasks.length);

  const heroStats = [
    { label: "Open", value: pendingTasks.length, note: `${highCount} high` },
    { label: "In progress", value: inProgress, note: "right now" },
    { label: "Applications", value: activeApps.length, note: `${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due` },
  ];

  return (
    <div className="space-y-6">
      {/* Dark hero: greeting, the single most important task, and the key numbers */}
      <section className="dot-grid relative overflow-hidden rounded-2xl bg-night p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="font-mono text-xs text-night-dim">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting()}, Tharun<span className="text-accent">.</span>
            </h1>

            {next ? (
              <div className="mt-6 rounded-xl border border-night-line bg-night-2/80 p-4 backdrop-blur">
                <p className="font-mono text-[10px] tracking-[0.14em] text-accent uppercase">Next up</p>
                <p className="mt-1.5 text-lg font-medium">{next.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-night-dim">
                  <span>{next.projectName}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 capitalize">
                    <Priority priority={next.priority} /> {next.priority}
                  </span>
                  {next.dueDate && (
                    <>
                      <span>·</span>
                      <span className={next.dueDate <= todayLocal() ? "text-accent" : ""}>due {relativeDay(next.dueDate).toLowerCase()}</span>
                    </>
                  )}
                  {next.status === "in_progress" && (
                    <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">in progress</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-night-dim">Nothing pending. A good moment to plan the next project.</p>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6 lg:w-72">
            <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {heroStats.map((stat) => (
                <div key={stat.label} className="lg:flex lg:items-baseline lg:justify-between lg:border-b lg:border-night-line lg:pb-3">
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-night-dim uppercase">{stat.label}</dt>
                  <dd className="mt-1 lg:mt-0 lg:text-right">
                    <span className="text-3xl font-semibold tabular-nums">{stat.value}</span>
                    <span className="block font-mono text-[10.5px] text-night-dim">{stat.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="flex justify-between font-mono text-[10.5px] text-night-dim">
                <span>overall progress</span>
                <span className="tabular-nums">{Math.round(doneShare * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night-line">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${doneShare * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {followUps.length > 0 && (
            <section className="space-y-2">
              <SectionLabel count={followUps.length}>Follow-ups due</SectionLabel>
              <div className="overflow-hidden rounded-xl border border-bad/30 bg-panel shadow-sm">
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
              <SectionLabel>After that</SectionLabel>
              {pendingTasks.length > 0 && (
                <button type="button" onClick={onOpenTasks} className="font-mono text-xs text-accent-text hover:underline">
                  all {pendingTasks.length} tasks →
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
              {upNext.length === 0 ? (
                <Empty>{next ? "That's the only open task." : "No open tasks. Ask Claude to add one."}</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {upNext.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel count={projects.length}>Projects</SectionLabel>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
              {projects.map((project) => {
                const open = pendingTasks.filter((t) => t.projectId === project.id).length;
                const done = doneTasks.filter((t) => t.projectId === project.id).length;
                const percent = open + done === 0 ? 0 : Math.round((done / (open + done)) * 100);
                return (
                  <li key={project.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem]">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] font-semibold">{project.name}</p>
                      <p className="truncate font-mono text-[11px] text-dim">
                        {open} open · {project.techStack.slice(0, 3).join(" · ") || "no stack yet"}
                      </p>
                    </div>
                    <div className="order-last col-span-2 h-1.5 overflow-hidden rounded-full bg-sunken sm:order-none sm:col-span-1">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-right font-mono text-xs text-dim tabular-nums">{percent}%</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <ActivityChart doneTasks={doneTasks} />
          <PromptList />
        </aside>
      </div>
    </div>
  );
}
