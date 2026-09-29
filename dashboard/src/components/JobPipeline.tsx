import type { Application, ApplicationStatus } from "../types";
import { shortDate, todayLocal } from "../lib/dates";
import { DueLabel, EmptyState } from "./ui";
import { IconExternal } from "./icons";

const STAGES: { key: ApplicationStatus; title: string; color: string }[] = [
  { key: "wishlist", title: "Wishlist", color: "from-slate-400 to-slate-500" },
  { key: "applied", title: "Applied", color: "from-sky-500 to-indigo-500" },
  { key: "interviewing", title: "Interviewing", color: "from-violet-500 to-fuchsia-500" },
  { key: "offer", title: "Offer", color: "from-emerald-500 to-teal-500" },
];

function initials(company: string): string {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function ApplicationCard({ application }: { application: Application }) {
  const followUpDue = application.followUpDate !== null && application.followUpDate <= todayLocal();
  const safeLink = application.jobUrl?.startsWith("https://") ? application.jobUrl : null;

  return (
    <article
      className={`rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-900/60 ${
        followUpDue ? "border-rose-400/60 ring-1 ring-rose-400/30" : "border-slate-200 dark:border-white/10"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
          {initials(application.company)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{application.company}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{application.role}</p>
        </div>
        {safeLink && (
          <a
            href={safeLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open job posting for ${application.company}`}
            className="text-slate-400 hover:text-indigo-500"
          >
            <IconExternal width={16} height={16} />
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {application.appliedDate ? `Applied ${shortDate(application.appliedDate)}` : "Not applied yet"}
          {application.source && ` · ${application.source}`}
        </span>
        {application.followUpDate && <DueLabel date={application.followUpDate} prefix="Follow up: " />}
      </div>
    </article>
  );
}

// Hiring pipeline: Wishlist → Applied → Interviewing → Offer
export function JobPipeline({ applications }: { applications: Application[] }) {
  const closed = applications.filter((a) => a.status === "rejected" || a.status === "withdrawn");

  return (
    <div>
      <div className="board-scroll -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {STAGES.map((stage) => {
          const items = applications.filter((a) => a.status === stage.key);
          return (
            <section
              key={stage.key}
              aria-label={stage.title}
              className="w-[75vw] max-w-xs shrink-0 snap-start lg:w-auto lg:max-w-none"
            >
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stage.title}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">{items.length}</span>
              </header>
              <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${stage.color}`} />
              <div className="space-y-2">
                {items.length === 0 ? (
                  <EmptyState>—</EmptyState>
                ) : (
                  items.map((application) => <ApplicationCard key={application.id} application={application} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
      {closed.length > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Closed: {closed.map((a) => `${a.company} (${a.status})`).join(", ")}
        </p>
      )}
      {applications.length === 0 && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No applications yet. When you apply somewhere, tell Claude: "In DevHub, I applied to …"
        </p>
      )}
    </div>
  );
}
