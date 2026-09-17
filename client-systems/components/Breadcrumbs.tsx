import Link from "next/link";
import { breadcrumbsFor } from "@/lib/content";
import { SITE } from "@/lib/site";

export function Breadcrumbs({ path }: { path: string }) {
  const crumbs = breadcrumbsFor(path);
  if (crumbs.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          const label = crumb.path === "/" ? SITE.name : crumb.heading;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {last ? (
                <span className="text-ink">{label}</span>
              ) : (
                <Link href={crumb.path} className="underline-offset-2 hover:underline">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
