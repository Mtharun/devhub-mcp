import type { ReactNode } from "react";
import { IconBell, IconBriefcase, IconChecklist, IconFolder } from "./icons";

interface Stat {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  accent: string;
}

interface Props {
  activeProjects: number;
  pendingTasks: number;
  highPriority: number;
  activeApplications: number;
  interviewing: number;
  followUpsDue: number;
}

export function StatTiles(props: Props) {
  const stats: Stat[] = [
    {
      label: "Active projects",
      value: props.activeProjects,
      detail: "being tracked",
      icon: <IconFolder />,
      accent: "from-indigo-500 to-violet-500",
    },
    {
      label: "Pending tasks",
      value: props.pendingTasks,
      detail: `${props.highPriority} high priority`,
      icon: <IconChecklist />,
      accent: "from-sky-500 to-cyan-500",
    },
    {
      label: "Applications",
      value: props.activeApplications,
      detail: `${props.interviewing} interviewing`,
      icon: <IconBriefcase />,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: "Follow-ups due",
      value: props.followUpsDue,
      detail: props.followUpsDue > 0 ? "reach out today" : "all caught up",
      icon: <IconBell />,
      accent: props.followUpsDue > 0 ? "from-rose-500 to-orange-500" : "from-slate-400 to-slate-500",
    },
  ];

  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
            <span className={`rounded-lg bg-gradient-to-br ${stat.accent} p-1.5 text-white shadow-sm`}>{stat.icon}</span>
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stat.detail}</div>
        </div>
      ))}
    </section>
  );
}
