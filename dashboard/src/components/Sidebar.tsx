import type { ReactNode } from "react";
import { timeAgo } from "../lib/dates";
import { IconBriefcase, IconChecklist, IconFolder, IconHome, IconMoon, IconRefresh, IconSun } from "./icons";

export const SECTIONS = ["overview", "tasks", "jobs", "projects"] as const;
export type Section = (typeof SECTIONS)[number];

const NAV: { id: Section; label: string; short: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", short: "Home", icon: <IconHome /> },
  { id: "tasks", label: "Tasks", short: "Tasks", icon: <IconChecklist /> },
  { id: "jobs", label: "Job search", short: "Jobs", icon: <IconBriefcase /> },
  { id: "projects", label: "Projects", short: "Projects", icon: <IconFolder /> },
];

interface Props {
  active: Section;
  counts: Record<Section, number | undefined>;
  onSelect: (section: Section) => void;
  loading: boolean;
  lastUpdated: Date | null;
  version?: string;
  theme: "light" | "dark";
  onRefresh: () => void;
  onToggleTheme: () => void;
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink font-mono text-sm font-bold text-canvas">
        dh
      </span>
      <div className="leading-tight">
        <p className="font-semibold">DevHub</p>
        <p className="font-mono text-[11px] text-dim">tharun's workspace</p>
      </div>
    </div>
  );
}

// Desktop: a sidebar. Phones: a top bar plus a bottom tab bar.
export function Sidebar(props: Props) {
  const { active, counts, onSelect, loading, lastUpdated, version, theme, onRefresh, onToggleTheme } = props;

  const tools = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh data"
        className="rounded-md p-2 text-dim transition hover:bg-panel hover:text-ink"
      >
        <IconRefresh className={loading ? "animate-spin" : ""} />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className="rounded-md p-2 text-dim transition hover:bg-panel hover:text-ink"
      >
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-sunken px-3 py-5 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Sections" className="mt-8 flex flex-col gap-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active === item.id ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition ${
                active === item.id ? "bg-panel font-medium text-ink shadow-sm ring-1 ring-line" : "text-dim hover:bg-panel/60 hover:text-ink"
              }`}
            >
              <span className={active === item.id ? "text-accent" : ""}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {counts[item.id] !== undefined && (
                <span className="font-mono text-xs text-dim tabular-nums">{counts[item.id]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-line px-2 pt-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[11px] text-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${lastUpdated ? "bg-good" : "bg-dim"}`} />
              {lastUpdated ? `synced ${timeAgo(lastUpdated)}` : "connecting…"}
            </span>
            {tools}
          </div>
          {version && <p className="font-mono text-[11px] text-dim">v{version} · local · read-only</p>}
        </div>
      </aside>

      {/* Phone top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-sunken/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo />
        {tools}
      </div>

      {/* Phone bottom tabs */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-sunken/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active === item.id ? "text-accent" : "text-dim"}`}
          >
            {item.icon}
            {item.short}
          </button>
        ))}
      </nav>
    </>
  );
}
