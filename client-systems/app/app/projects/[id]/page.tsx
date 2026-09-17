import { notFound } from "next/navigation";
import { addBlockerAction } from "@/lib/actions/projects";
import { ProjectNav, StatusPill } from "@/components/ProjectNav";
import { requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { escalateOverdueAccessForProject } from "@/lib/automations";

function fmt(value?: Date | string | null) {
  if (!value) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  await escalateOverdueAccessForProject(id);
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      client: true,
      deliverables: { orderBy: { sortOrder: "asc" } },
      blockers: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" } },
      tasks: true,
      accessItems: true,
      handoff: true,
    },
  });
  if (!project) notFound();

  const done = project.tasks.filter((task) => task.status === "DONE").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            {project.client.clientName}
          </p>
          <h1 className="font-display text-3xl font-semibold">{project.engagementName}</h1>
        </div>
        <div className="flex gap-2">
          <StatusPill value={project.stage} />
          <StatusPill value={project.handoffStatus} />
        </div>
      </div>
      <ProjectNav projectId={project.id} current="" />

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Kickoff", fmt(project.kickoffDate)],
          ["End", fmt(project.endDate)],
          ["Success metric", project.successMetric || project.client.successMetric],
          ["Account lead", project.accountLeadEmail],
          ["Delivery lead", project.deliveryLeadEmail],
          ["Channel", project.primaryChannel || project.client.preferredChannel],
          ["Investment", project.totalInvestment],
          ["Payment terms", project.paymentTerms],
          ["Brand kit", project.client.brandKitStatus],
          ["Tasks", `${done}/${project.tasks.length} done`],
          ["Open blockers", String(project.blockers.length)],
          ["Access items", String(project.accessItems.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white p-3">
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Scope</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line bg-white p-4 text-sm">
            <p className="text-xs font-semibold text-muted uppercase">In scope</p>
            <p className="mt-2 whitespace-pre-wrap">{project.inScope || "—"}</p>
          </div>
          <div className="rounded-md border border-line bg-white p-4 text-sm">
            <p className="text-xs font-semibold text-muted uppercase">Out of scope</p>
            <p className="mt-2 whitespace-pre-wrap">{project.outOfScope || "—"}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Deliverables</h2>
        {project.deliverables.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None captured in intake.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white">
            {project.deliverables.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {item.name}
                  {item.format ? ` · ${item.format}` : ""}
                </span>
                <span className="text-muted">{fmt(item.dueDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Blockers</h2>
        {project.blockers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None open.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {project.blockers.map((blocker) => (
              <li key={blocker.id} className="rounded-md border border-line bg-white p-3 text-sm">
                <p className="font-medium">{blocker.description}</p>
                <p className="mt-1 text-muted">
                  {blocker.ownerEmail || "Unassigned"} · next: {blocker.nextAction || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form action={addBlockerAction} className="mt-4 grid gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-4">
          <input type="hidden" name="projectId" value={project.id} />
          <input name="description" required placeholder="Blocker" className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2" />
          <input name="ownerEmail" placeholder="Owner email" className="rounded-md border border-line px-3 py-2 text-sm" />
          <button className="rounded-sm bg-forest px-3 py-2 text-sm font-semibold text-white">
            Add blocker
          </button>
        </form>
      </section>
    </div>
  );
}
