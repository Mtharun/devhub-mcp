import { greeting, timeAgo } from "../lib/dates";
import { IconMoon, IconRefresh, IconSun } from "./icons";

interface Props {
  loading: boolean;
  lastUpdated: Date | null;
  theme: "light" | "dark";
  onRefresh: () => void;
  onToggleTheme: () => void;
}

export function Header({ loading, lastUpdated, theme, onRefresh, onToggleTheme }: Props) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-500/20" />
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{today}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()},{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Tharun</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {lastUpdated && (
          <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
            Updated {timeAgo(lastUpdated)}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-400"
        >
          <IconRefresh className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-indigo-400 dark:border-white/10 dark:bg-white/5"
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
