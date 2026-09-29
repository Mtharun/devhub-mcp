import { useEffect, useState } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { todayLocal } from "./lib/dates";
import { TopNav, type Section } from "./components/TopNav";
import { Overview } from "./components/Overview";
import { TaskList } from "./components/TaskList";
import { JobTracker } from "./components/JobTracker";
import { ProjectList } from "./components/ProjectList";
import { PageHeader } from "./components/ui";

const ACTIVE_JOB_STATUSES = ["wishlist", "applied", "interviewing", "offer"];

function initialSection(): Section {
  const hash = window.location.hash.replace("#", "");
  return (["overview", "tasks", "jobs", "projects"] as const).find((s) => s === hash) ?? "overview";
}

export default function App() {
  const { data, error, loading, lastUpdated, refresh } = useDashboardData();
  const [section, setSection] = useState<Section>(initialSection);

  const select = (next: Section) => {
    setSection(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  };

  // Keyboard shortcuts: 1-4 switch sections, "/" jumps to task search, "r" refreshes
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.ctrlKey || event.metaKey || event.altKey || target.closest("input, textarea")) return;
      const index = ["1", "2", "3", "4"].indexOf(event.key);
      if (index >= 0) select((["overview", "tasks", "jobs", "projects"] as const)[index]);
      if (event.key === "r") void refresh();
      if (event.key === "/") {
        event.preventDefault();
        select("tasks");
        window.setTimeout(() => document.getElementById("task-search")?.focus(), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const today = todayLocal();
  const pendingTasks = data?.pendingTasks ?? [];
  const doneTasks = data?.doneTasks ?? [];
  const applications = data?.applications ?? [];
  const projects = data?.projects ?? [];
  const activeApplications = applications.filter((a) => ACTIVE_JOB_STATUSES.includes(a.status));
  const followUps = activeApplications.filter((a) => a.followUpDate !== null && a.followUpDate <= today);

  return (
    <div>
      <TopNav
        active={section}
        counts={{
          overview: undefined,
          tasks: data ? pendingTasks.length : undefined,
          jobs: data ? activeApplications.length : undefined,
          projects: data ? projects.length : undefined,
        }}
        onSelect={select}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={() => void refresh()}
      />

      <main className="px-4 pt-6 pb-28 sm:px-6 md:pt-8 md:pb-12">
        <div className="mx-auto max-w-6xl">
          {error && (
            <div role="alert" className="mb-6 rounded-3xl bg-rose p-5 text-sm">
              <p className="font-semibold text-rose-ink">Can't reach the DevHub API</p>
              <p className="mt-1 text-dim">{error}</p>
              <p className="mt-1 text-dim">
                Start it with <code className="font-mono text-ink">npm run web</code> in the devhub-mcp folder.
              </p>
            </div>
          )}

          {!data && !error ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-48 animate-pulse rounded-[2rem] bg-sunken" />
              <div className="h-28 animate-pulse rounded-3xl bg-sunken" />
              <div className="h-48 animate-pulse rounded-3xl bg-sunken" />
            </div>
          ) : (
            <div key={section} className="page-enter">
              {section === "overview" && (
                <Overview
                  projects={projects}
                  pendingTasks={pendingTasks}
                  doneTasks={doneTasks}
                  applications={applications}
                  followUps={followUps}
                  onOpenTasks={() => select("tasks")}
                />
              )}

              {section === "tasks" && (
                <div className="space-y-6">
                  <PageHeader
                    title="Tasks"
                    meta={`${pendingTasks.length} open · ${doneTasks.length} done · sorted by priority, then due date`}
                  />
                  <TaskList pendingTasks={pendingTasks} doneTasks={doneTasks} />
                </div>
              )}

              {section === "jobs" && (
                <div className="space-y-6">
                  <PageHeader
                    title="Job search"
                    meta={`${activeApplications.length} active · ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due`}
                  />
                  <JobTracker applications={applications} />
                </div>
              )}

              {section === "projects" && (
                <div className="space-y-6">
                  <PageHeader title="Projects" meta={`${projects.length} active · archived projects are hidden`} />
                  <ProjectList projects={projects} pendingTasks={pendingTasks} doneTasks={doneTasks} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
