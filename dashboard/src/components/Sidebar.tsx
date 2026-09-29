import type { ReactNode } from "react";
import { timeAgo } from "../lib/dates";
import { IconBriefcase, IconChecklist, IconFolder, IconHome, IconRefresh } from "./icons";

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
  onRefresh: () => void;
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-sm font-bold text-white shadow-[0_0_24px_-4px_var(--accent)]">
        {"{}"}
      </span>
      <div className="leading-tight">
        <p className="font-semibold text-white">DevHub</p>
        <p className="font-mono text-[11px] text-night-dim">tharun's workspace</p>
      </div>
    </div>
  );
}

function RefreshButton({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      aria-label="Refresh data"
      className="rounded-md p-2 text-night-dim transition hover:bg-night-2 hover:text-white"
    >
      <IconRefresh className={loading ? "animate-spin" : ""} />
    </button>
  );
}

// Desktop: a dark sidebar. Phones: a dark top bar plus a bottom tab bar.
export function Sidebar({ active, counts, onSelect, loading, lastUpdated, version, onRefresh }: Props) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-night px-3 py-6 md:flex">
        <div className="px-2">
          <Logo />
        </div>

        <p className="mt-10 px-3 font-mono text-[10px] tracking-[0.14em] text-night-dim uppercase">Workspace</p>
        <nav aria-label="Sections" className="mt-2 flex flex-col gap-1">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  isActive ? "bg-night-2 font-medium text-white" : "text-night-dim hover:bg-night-2/60 hover:text-white"
                }`}
              >
                {isActive && <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r bg-accent" />}
                <span className={isActive ? "text-accent" : ""}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {counts[item.id] !== undefined && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      isActive ? "bg-accent text-white" : "bg-night-2 text-night-dim"
                    }`}
                  >
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-night-line bg-night-2 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[11px] text-night-dim">
              <span className="relative flex h-2 w-2">
                {lastUpdated && <span className="absolute inset-0 animate-ping rounded-full bg-green-400/60" />}
                <span className={`relative h-2 w-2 rounded-full ${lastUpdated ? "bg-green-400" : "bg-night-dim"}`} />
              </span>
              {lastUpdated ? `live · ${timeAgo(lastUpdated)}` : "connecting…"}
            </span>
            <RefreshButton loading={loading} onRefresh={onRefresh} />
          </div>
          <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-night-dim">
            {version ? `v${version} · ` : ""}local data · read-only
            <br />
            Changes happen through Claude.
          </p>
        </div>
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between bg-night px-4 py-2.5 md:hidden">
        <Logo />
        <RefreshButton loading={loading} onRefresh={onRefresh} />
      </div>

      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-4 rounded-2xl bg-night p-1 shadow-xl shadow-black/20 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition ${
              active === item.id ? "bg-night-2 text-accent" : "text-night-dim"
            }`}
          >
            {item.icon}
            {item.short}
          </button>
        ))}
      </nav>
    </>
  );
}
