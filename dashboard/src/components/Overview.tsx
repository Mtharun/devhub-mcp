import { useState, type ReactNode } from "react";
import type { Application, Project, Task } from "../types";
import { greeting, relativeDay, todayLocal } from "../lib/dates";
import { TaskRow } from "./TaskList";
import { ApplicationRow } from "./JobTracker";
import { Card, Empty, Priority, SectionLabel, TINT, Tag, tintFor, type Tint } from "./ui";
import { IconBell, IconBriefcase, IconChecklist, IconFolder, IconSparkle } from "./icons";

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
    return { key: todayLocal(date), label: date.toLocaleDateString(undefined, { weekday: "short" }), count: 0 };
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
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Done this week</SectionLabel>
        <span className="text-3xl font-bold text-lav-ink tabular-nums">{total}</span>
      </div>
      <div className="mt-5 flex h-28 items-end gap-2" role="img" aria-label={`${total} tasks finished in the last 7 days`}>
        {days.map((day, index) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-semibold text-dim tabular-nums">{day.count > 0 ? day.count : ""}</span>
            <div
              className={`w-full rounded-xl transition-all duration-700 ${
                index === 6 ? "bg-accent" : day.count > 0 ? "bg-lav" : "bg-sunken"
              }`}
              style={{ height: `${Math.max(8, (day.count / max) * 72)}px` }}
              title={`${day.key}: ${day.count} done`}
            />
            <span className={`text-[11px] ${index === 6 ? "font-bold text-lav-ink" : "text-dim"}`}>{day.label}</span>
          </div>
        ))}
      </div>
    </Card>
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
    <Card className="p-5">
      <SectionLabel>
        <IconSparkle className="text-lav-ink" /> Ask Claude
      </SectionLabel>
      <p className="mt-1 text-xs text-dim">Click a prompt to copy it, then paste it in Claude.</p>
      <ul className="mt-3 space-y-2">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => copy(prompt)}
              className={`flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-[13px] transition hover:-translate-y-px ${
                copied === prompt ? "bg-mint text-mint-ink" : "bg-sunken text-ink/80 hover:bg-lav hover:text-lav-ink"
              }`}
            >
              <span className="min-w-0 flex-1">{prompt}</span>
              <span className="shrink-0 text-[11px] font-semibold">{copied === prompt ? "Copied" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StatCard({ tint, label, value, note, icon }: { tint: Tint; label: string; value: number; note: string; icon: ReactNode }) {
  const t = TINT[tint];
  return (
    <div className={`rounded-3xl p-5 ${t.bg}`}>
      <div className={`flex items-center justify-between ${t.ink}`}>
        <span className="text-sm font-semibold">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-panel/70">{icon}</span>
      </div>
      <p className={`mt-3 text-4xl font-bold tabular-nums ${t.ink}`}>{value}</p>
      <p className={`mt-1 text-xs ${t.ink} opacity-75`}>{note}</p>
    </div>
  );
}

export function Overview({ projects, pendingTasks, doneTasks, applications, followUps, onOpenTasks }: Props) {
  const [next, ...rest] = pendingTasks;
  const upNext = rest.slice(0, 4);
  const inProgress = pendingTasks.filter((t) => t.status === "in_progress").length;
  const activeApps = applications.filter((a) => ["wishlist", "applied", "interviewing", "offer"].includes(a.status));
  const interviewing = applications.filter((a) => a.status === "interviewing").length;
  const doneShare = pendingTasks.length + doneTasks.length === 0 ? 0 : doneTasks.length / (pendingTasks.length + doneTasks.length);

  return (
    <div className="space-y-8">
      {/* Soft gradient hero: greeting and the single most important task */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-lav via-sky to-mint p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-peach/80 blur-3xl" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <p className="text-sm font-medium text-ink/60">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">
              {greeting()}, Tharun
            </h1>
            <p className="mt-2 max-w-md text-ink/70">
              {pendingTasks.length === 0
                ? "Nothing pending. A good moment to plan the next project."
                : `You have ${pendingTasks.length} open task${pendingTasks.length === 1 ? "" : "s"}${
                    followUps.length > 0 ? ` and ${followUps.length} job follow-up${followUps.length === 1 ? "" : "s"} due` : ""
                  }.`}
            </p>
            <div className="mt-5 max-w-md">
              <div className="flex justify-between text-xs font-semibold text-ink/60">
                <span>Overall progress</span>
                <span className="tabular-nums">{Math.round(doneShare * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-panel/60">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${doneShare * 100}%` }} />
              </div>
            </div>
          </div>

          {next ? (
            <div className="rounded-3xl bg-panel/90 p-5 shadow-xl shadow-lav-ink/10 backdrop-blur">
              <p className="text-xs font-bold tracking-wide text-lav-ink uppercase">Next up</p>
              <p className="mt-2 text-lg leading-snug font-bold">{next.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Tag tint={tintFor(next.projectName)}>{next.projectName}</Tag>
                <Priority priority={next.priority} />
                {next.status === "in_progress" && <Tag tint="sky">In progress</Tag>}
              </div>
              {next.dueDate && (
                <p className={`mt-3 text-sm font-medium ${next.dueDate <= todayLocal() ? "text-rose-ink" : "text-dim"}`}>
                  Due {relativeDay(next.dueDate).toLowerCase()}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tint="lav" label="Open tasks" value={pendingTasks.length} note={`${pendingTasks.filter((t) => t.priority === "high").length} high priority`} icon={<IconChecklist />} />
        <StatCard tint="sky" label="In progress" value={inProgress} note="started" icon={<IconFolder />} />
        <StatCard tint="mint" label="Applications" value={activeApps.length} note={`${interviewing} interviewing`} icon={<IconBriefcase />} />
        <StatCard
          tint={followUps.length > 0 ? "rose" : "peach"}
          label="Follow-ups due"
          value={followUps.length}
          note={followUps.length > 0 ? "reach out today" : "all caught up"}
          icon={<IconBell />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {followUps.length > 0 && (
            <section className="space-y-3">
              <SectionLabel count={followUps.length}>Follow-ups due</SectionLabel>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {followUps.map((application) => (
                    <ApplicationRow key={application.id} application={application} />
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>After that</SectionLabel>
              {pendingTasks.length > 0 && (
                <button type="button" onClick={onOpenTasks} className="rounded-full px-3 py-1 text-sm font-semibold text-lav-ink hover:bg-lav">
                  All {pendingTasks.length} tasks →
                </button>
              )}
            </div>
            <Card className="overflow-hidden">
              {upNext.length === 0 ? (
                <Empty>{next ? "That's the only open task." : "No open tasks. Ask Claude to add one."}</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {upNext.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="space-y-3">
            <SectionLabel count={projects.length}>Projects</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const open = pendingTasks.filter((t) => t.projectId === project.id).length;
                const done = doneTasks.filter((t) => t.projectId === project.id).length;
                const percent = open + done === 0 ? 0 : Math.round((done / (open + done)) * 100);
                const tint = TINT[tintFor(project.name)];
                return (
                  <div key={project.id} className={`rounded-3xl p-4 ${tint.bg}`}>
                    <div className={`flex items-baseline justify-between gap-2 ${tint.ink}`}>
                      <span className="truncate font-bold">{project.name}</span>
                      <span className="text-sm font-bold tabular-nums">{percent}%</span>
                    </div>
                    <p className={`mt-0.5 text-xs ${tint.ink} opacity-75`}>{open} open</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel/70">
                      <div className={`h-full rounded-full ${tint.bar}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
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
