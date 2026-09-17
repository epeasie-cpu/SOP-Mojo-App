import { notFound } from "next/navigation";
import { addAccessItemAction, updateAccessItemAction } from "@/lib/actions/projects";
import { ProjectNav, StatusPill } from "@/components/ProjectNav";
import { requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { escalateOverdueAccessForProject } from "@/lib/automations";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  await escalateOverdueAccessForProject(id);
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { client: true, accessItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!project) notFound();
  const now = new Date();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Access</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        Later / unreceived items past the SLA create a blocked task for the account lead.
        Brand kit Later uses kickoff + 3 days.
      </p>
      <ProjectNav projectId={project.id} current="/access" />

      <ul className="mt-6 space-y-4">
        {project.accessItems.map((item) => {
          const overdue =
            !item.receivedAt &&
            item.canProvide !== "NO" &&
            item.slaDeadline &&
            item.slaDeadline.getTime() < now.getTime();
          return (
            <li key={item.id} className="rounded-lg border border-line bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{item.itemName}</h2>
                <StatusPill value={item.canProvide} />
                {item.escalationSent ? <StatusPill value="ESCALATED" /> : null}
                {overdue ? <StatusPill value="OVERDUE" /> : null}
              </div>
              <form action={updateAccessItemAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="itemId" value={item.id} />
                <label className="text-sm">
                  <span className="mb-1 block">Can provide</span>
                  <select name="canProvide" defaultValue={item.canProvide} className="w-full rounded-md border border-line px-3 py-2">
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    <option value="LATER">LATER</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block">URL</span>
                  <input name="url" defaultValue={item.url ?? ""} className="w-full rounded-md border border-line px-3 py-2" />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block">Notes</span>
                  <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} className="w-full rounded-md border border-line px-3 py-2" />
                </label>
                <p className="text-xs text-muted">
                  SLA: {item.slaDeadline ? item.slaDeadline.toISOString().slice(0, 10) : "none"}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="received" defaultChecked={Boolean(item.receivedAt)} />
                  Received
                </label>
                <button className="rounded-sm bg-forest px-3 py-2 text-sm font-semibold text-white sm:col-span-2">
                  Save item
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <form action={addAccessItemAction} className="mt-6 grid gap-3 rounded-lg border border-dashed border-line bg-white p-4 sm:grid-cols-4">
        <input type="hidden" name="projectId" value={project.id} />
        <input name="itemName" required placeholder="Item name" className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2" />
        <select name="canProvide" defaultValue="LATER" className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="YES">YES</option>
          <option value="NO">NO</option>
          <option value="LATER">LATER</option>
        </select>
        <button className="rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink">
          Add access item
        </button>
      </form>
    </div>
  );
}
