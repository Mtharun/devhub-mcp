import type { Application, ApplicationStatus } from "../types";
import { shortDate, todayLocal } from "../lib/dates";
import { Due, Empty, SectionLabel } from "./ui";
import { IconExternal } from "./icons";

const STAGES: { key: ApplicationStatus; label: string }[] = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offer" },
];

const STATUS_TEXT: Record<ApplicationStatus, string> = {
  wishlist: "text-dim",
  applied: "text-ink",
  interviewing: "text-accent",
  offer: "text-good",
  rejected: "text-dim",
  withdrawn: "text-dim",
  archived: "text-dim",
};

// A horizontal stepper: each stage with its count, joined by a line
export function PipelineStepper({ applications }: { applications: Application[] }) {
  return (
    <ol className="grid grid-cols-4 overflow-hidden rounded-lg border border-line bg-panel">
      {STAGES.map((stage, index) => {
        const count = applications.filter((a) => a.status === stage.key).length;
        return (
          <li key={stage.key} className={`relative px-3 py-3 sm:px-4 ${index > 0 ? "border-l border-line" : ""}`}>
            <p className="truncate font-mono text-[10px] tracking-[0.08em] text-dim uppercase sm:text-[11px]">
              {stage.label}
            </p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${count > 0 ? STATUS_TEXT[stage.key] : "text-dim/60"}`}>
              {count}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function ApplicationRow({ application }: { application: Application }) {
  const due = application.followUpDate !== null && application.followUpDate <= todayLocal();
  const link = application.jobUrl?.startsWith("https://") ? application.jobUrl : null;

  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${due ? "bg-bad-soft/60" : ""}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-canvas font-mono text-xs font-semibold">
        {application.company.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {application.company}
          <span className="font-normal text-dim"> · {application.role}</span>
        </p>
        <p className="truncate font-mono text-[11px] text-dim">
          {application.appliedDate ? `applied ${shortDate(application.appliedDate)}` : "not applied yet"}
          {application.source && ` · ${application.source}`}
        </p>
      </div>
      <span className={`hidden font-mono text-xs capitalize sm:inline ${STATUS_TEXT[application.status]}`}>
        {application.status}
      </span>
      <span className="shrink-0 text-right">
        {application.followUpDate && <Due date={application.followUpDate} prefix="follow up " />}
      </span>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${application.company} job posting`} className="text-dim hover:text-accent">
          <IconExternal width={16} height={16} />
        </a>
      )}
    </li>
  );
}

export function JobTracker({ applications }: { applications: Application[] }) {
  const active = applications.filter((a) => STAGES.some((s) => s.key === a.status));
  const closed = applications.filter((a) => a.status === "rejected" || a.status === "withdrawn");
  // Most urgent follow-ups first, then everything else
  const sorted = [...active].sort((a, b) => (a.followUpDate ?? "9999").localeCompare(b.followUpDate ?? "9999"));

  return (
    <div className="space-y-6">
      <PipelineStepper applications={applications} />

      <section className="space-y-2">
        <SectionLabel count={sorted.length}>Active applications</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {sorted.length === 0 ? (
            <Empty>No applications yet. When you apply somewhere, tell Claude: "In DevHub, I applied to …"</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {closed.length > 0 && (
        <section className="space-y-2">
          <SectionLabel count={closed.length}>Closed</SectionLabel>
          <div className="overflow-hidden rounded-lg border border-line bg-panel opacity-80">
            <ul className="divide-y divide-line">
              {closed.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
