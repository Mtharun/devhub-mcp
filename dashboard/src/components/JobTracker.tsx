import type { Application, ApplicationStatus } from "../types";
import { shortDate, todayLocal } from "../lib/dates";
import { Card, Due, Empty, SectionLabel, TINT, type Tint } from "./ui";
import { IconExternal } from "./icons";

const STAGES: { key: ApplicationStatus; label: string; tint: Tint }[] = [
  { key: "wishlist", label: "Wishlist", tint: "butter" },
  { key: "applied", label: "Applied", tint: "sky" },
  { key: "interviewing", label: "Interviewing", tint: "lav" },
  { key: "offer", label: "Offer", tint: "mint" },
];

const STATUS_TINT: Record<ApplicationStatus, Tint> = {
  wishlist: "butter",
  applied: "sky",
  interviewing: "lav",
  offer: "mint",
  rejected: "rose",
  withdrawn: "rose",
  archived: "butter",
};

// One pastel card per stage, joined by small arrows
export function PipelineStepper({ applications }: { applications: Application[] }) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAGES.map((stage, index) => {
        const count = applications.filter((a) => a.status === stage.key).length;
        const tint = TINT[stage.tint];
        return (
          <li key={stage.key} className={`relative rounded-3xl p-5 ${tint.bg}`}>
            <p className={`text-sm font-semibold ${tint.ink}`}>{stage.label}</p>
            <p className={`mt-2 text-4xl font-bold tabular-nums ${tint.ink}`}>{count}</p>
            <p className={`mt-1 text-xs ${tint.ink} opacity-70`}>step {index + 1} of 4</p>
          </li>
        );
      })}
    </ol>
  );
}

export function ApplicationRow({ application }: { application: Application }) {
  const due = application.followUpDate !== null && application.followUpDate <= todayLocal();
  const link = application.jobUrl?.startsWith("https://") ? application.jobUrl : null;
  const tint = TINT[STATUS_TINT[application.status]];

  return (
    <li className={`flex items-center gap-3 px-5 py-3.5 ${due ? "bg-rose/50" : ""}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${tint.bg} ${tint.ink}`}>
        {application.company.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {application.company}
          <span className="font-normal text-dim"> · {application.role}</span>
        </p>
        <p className="truncate text-xs text-dim">
          {application.appliedDate ? `Applied ${shortDate(application.appliedDate)}` : "Not applied yet"}
          {application.source && ` · ${application.source}`}
        </p>
      </div>
      <span className={`hidden rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize sm:inline ${tint.bg} ${tint.ink}`}>
        {application.status}
      </span>
      <span className="shrink-0 text-right">
        {application.followUpDate && <Due date={application.followUpDate} prefix="Follow up " />}
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
  const sorted = [...active].sort((a, b) => (a.followUpDate ?? "9999").localeCompare(b.followUpDate ?? "9999"));

  return (
    <div className="space-y-8">
      <PipelineStepper applications={applications} />

      <section className="space-y-3">
        <SectionLabel count={sorted.length}>Active applications</SectionLabel>
        <Card className="overflow-hidden">
          {sorted.length === 0 ? (
            <Empty>No applications yet. When you apply somewhere, tell Claude: "In DevHub, I applied to …"</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <SectionLabel count={closed.length}>Closed</SectionLabel>
          <Card className="overflow-hidden opacity-80">
            <ul className="divide-y divide-line">
              {closed.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
