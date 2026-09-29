import { useState } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { useTheme } from "./hooks/useTheme";
import { todayLocal } from "./lib/dates";
import { Header } from "./components/Header";
import { StatTiles } from "./components/StatTiles";
import { FocusPanel } from "./components/FocusPanel";
import { TaskBoard } from "./components/TaskBoard";
import { JobPipeline } from "./components/JobPipeline";
import { ProjectGrid } from "./components/ProjectGrid";
import { SectionTitle } from "./components/ui";

const TABS = ["Overview", "Tasks", "Jobs", "Projects"] as const;
type Tab = (typeof TABS)[number];

const ACTIVE_JOB_STATUSES = ["wishlist", "applied", "interviewing", "offer"];

export default function App() {
  const { data, error, loading, lastUpdated, refresh } = useDashboardData();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("Overview");

  const today = todayLocal();
  const pendingTasks = data?.pendingTasks ?? [];
  const doneTasks = data?.doneTasks ?? [];
  const applications = data?.applications ?? [];
  const projects = data?.projects ?? [];
  const followUps = applications.filter(
    (a) => a.followUpDate !== null && a.followUpDate <= today && ACTIVE_JOB_STATUSES.includes(a.status)
  );

  const show = (section: Tab) => tab === "Overview" || tab === section;

  return (
    <div className="hero-glow min-h-screen">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Header
          loading={loading}
          lastUpdated={lastUpdated}
          theme={theme}
          onRefresh={() => void refresh()}
          onToggleTheme={toggle}
        />

        <nav
          aria-label="Sections"
          className="sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto bg-slate-50/80 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-2 dark:bg-slate-950/70"
        >
          <div className="inline-flex gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/5">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-pressed={tab === name}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  tab === name
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </nav>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
            <p className="font-semibold">Could not load DevHub data</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1 opacity-80">Is the API running? Start it with <code className="font-mono">npm run web</code> in the devhub-mcp folder.</p>
          </div>
        )}

        {!data && !error ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          <main className="space-y-10">
            {tab === "Overview" && (
              <>
                <StatTiles
                  activeProjects={projects.length}
                  pendingTasks={pendingTasks.length}
                  highPriority={pendingTasks.filter((t) => t.priority === "high").length}
                  activeApplications={applications.filter((a) => ACTIVE_JOB_STATUSES.includes(a.status)).length}
                  interviewing={applications.filter((a) => a.status === "interviewing").length}
                  followUpsDue={followUps.length}
                />
                <FocusPanel pendingTasks={pendingTasks} followUps={followUps} />
              </>
            )}

            {show("Tasks") && (
              <section>
                <SectionTitle hint="Sorted by priority, then due date">Task board</SectionTitle>
                <TaskBoard pendingTasks={pendingTasks} doneTasks={doneTasks} />
              </section>
            )}

            {show("Jobs") && (
              <section>
                <SectionTitle hint="Wishlist → Applied → Interviewing → Offer">Job pipeline</SectionTitle>
                <JobPipeline applications={applications} />
              </section>
            )}

            {show("Projects") && (
              <section>
                <SectionTitle hint="Ring = share of tasks done">Projects</SectionTitle>
                <ProjectGrid projects={projects} pendingTasks={pendingTasks} doneTasks={doneTasks} />
              </section>
            )}
          </main>
        )}

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>Read-only view of your local DevHub data. Make changes by talking to Claude.</span>
          {data && <span className="font-mono">DevHub v{data.version}</span>}
        </footer>
      </div>
    </div>
  );
}
