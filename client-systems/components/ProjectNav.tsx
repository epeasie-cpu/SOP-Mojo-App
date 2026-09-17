import Link from "next/link";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/board", label: "Board" },
  { href: "/handoff", label: "Handoff" },
  { href: "/access", label: "Access" },
] as const;

export function ProjectNav({ projectId, current }: { projectId: string; current: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const href = `/app/projects/${projectId}${tab.href}`;
        const active = current === tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`rounded-t-sm px-3 py-2 text-sm whitespace-nowrap ${
              active
                ? "border-b-2 border-forest font-semibold text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "COMPLETE" || value === "DONE"
      ? "bg-lime text-lime-ink"
      : value === "BLOCKED"
        ? "bg-red-100 text-red-800"
        : value === "DOING" || value === "ONBOARDING"
          ? "bg-forest text-white"
          : "bg-white text-muted border border-line";
  return (
    <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
