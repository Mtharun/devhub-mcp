import type { ReactNode } from "react";
import { timeAgo } from "../lib/dates";
import { IconBriefcase, IconChecklist, IconFolder, IconHome, IconRefresh } from "./icons";

export const SECTIONS = ["overview", "tasks", "jobs", "projects"] as const;
export type Section = (typeof SECTIONS)[number];

const NAV: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Home", icon: <IconHome /> },
  { id: "tasks", label: "Tasks", icon: <IconChecklist /> },
  { id: "jobs", label: "Jobs", icon: <IconBriefcase /> },
  { id: "projects", label: "Projects", icon: <IconFolder /> },
];

interface Props {
  active: Section;
  counts: Record<Section, number | undefined>;
  onSelect: (section: Section) => void;
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-lav to-peach font-mono text-sm font-bold text-lav-ink">
        {"{}"}
      </span>
      <span className="text-[17px] font-bold tracking-tight">DevHub</span>
    </div>
  );
}

// Desktop and tablet: a top bar with pill tabs. Phones: top bar plus a floating bottom tab bar.
export function TopNav({ active, counts, onSelect, loading, lastUpdated, onRefresh }: Props) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />

          <nav aria-label="Sections" className="hidden items-center gap-1 rounded-full border border-line bg-panel p-1 md:flex">
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    isActive ? "bg-lav text-lav-ink" : "text-dim hover:bg-sunken hover:text-ink"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {counts[item.id] !== undefined && (
                    <span className={`text-xs tabular-nums ${isActive ? "text-lav-ink/70" : "text-dim/70"}`}>{counts[item.id]}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-xs text-dim sm:flex">
              <span className="relative flex h-2 w-2">
                {lastUpdated && <span className="absolute inset-0 animate-ping rounded-full bg-mint-ink/40" />}
                <span className={`relative h-2 w-2 rounded-full ${lastUpdated ? "bg-mint-ink" : "bg-dim"}`} />
              </span>
              {lastUpdated ? `Live · ${timeAgo(lastUpdated)}` : "Connecting…"}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh data"
              className="rounded-full border border-line bg-panel p-2 text-dim transition hover:text-ink"
            >
              <IconRefresh className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-4 gap-1 rounded-3xl border border-line bg-panel/95 p-1.5 shadow-lg shadow-black/5 backdrop-blur md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold transition ${
              active === item.id ? "bg-lav text-lav-ink" : "text-dim"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
