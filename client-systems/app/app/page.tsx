import Link from "next/link";
import { StatusPill } from "@/components/ProjectNav";
import { requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    include: { client: true, _count: { select: { tasks: true, accessItems: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Intake, handoff, access SLA, and the onboarding board — in this workspace.
          </p>
        </div>
        <Link
          href="/app/projects/new"
          className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
        >
          New project
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-line bg-white p-8 text-sm text-muted">
          No projects yet. Create one from intake. Completing handoff seeds the 31-task board.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/projects/${project.id}`}
                className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4 hover:border-forest sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{project.engagementName}</p>
                  <p className="text-sm text-muted">{project.client.clientName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusPill value={project.stage} />
                  <StatusPill value={`HANDOFF ${project.handoffStatus}`} />
                  <span>{project._count.tasks} tasks</span>
                  <span>{project._count.accessItems} access items</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
