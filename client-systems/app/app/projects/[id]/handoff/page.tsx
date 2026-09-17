import { notFound } from "next/navigation";
import { CopyDraft } from "@/components/CopyDraft";
import { ProjectNav, StatusPill } from "@/components/ProjectNav";
import { saveHandoffAction } from "@/lib/actions/projects";
import { requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inputClass = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

export default async function HandoffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { client: true, handoff: true, tasks: true },
  });
  if (!project?.handoff) notFound();
  const handoff = project.handoff;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold">Handoff</h1>
        <StatusPill value={handoff.status} />
      </div>
      <ProjectNav projectId={project.id} current="/handoff" />
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Sales-to-delivery gate. When both account lead and delivery lead confirm,
        status becomes Complete, Blueprint A tasks seed, and a welcome draft is
        generated here (not emailed in v1).
      </p>

      <form action={saveHandoffAction} className="mt-6 space-y-4 rounded-lg border border-line bg-white p-4 sm:p-6">
        <input type="hidden" name="projectId" value={project.id} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Proposal link</span>
          <input name="proposalLink" defaultValue={handoff.proposalLink ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Contract link</span>
          <input name="contractLink" defaultValue={handoff.contractLink ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Commercial notes</span>
          <textarea name="commercialNotes" rows={3} defaultValue={handoff.commercialNotes ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Payment notes</span>
          <textarea name="paymentNotes" rows={2} defaultValue={handoff.paymentNotes ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Scope promises from sales</span>
          <textarea name="scopePromises" rows={3} defaultValue={handoff.scopePromises ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Kickoff agenda notes</span>
          <textarea name="kickoffAgendaNotes" rows={3} defaultValue={handoff.kickoffAgendaNotes ?? ""} className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Risk 1</span>
            <input name="risk1" defaultValue={handoff.risk1 ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Risk 2</span>
            <input name="risk2" defaultValue={handoff.risk2 ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Risk 3</span>
            <input name="risk3" defaultValue={handoff.risk3 ?? ""} className={inputClass} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="completedByAccountLead"
            defaultChecked={handoff.completedByAccountLead}
          />
          Account lead confirms handoff is complete
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="acceptedByDeliveryLead"
            defaultChecked={handoff.acceptedByDeliveryLead}
          />
          Delivery lead accepts the handoff
        </label>
        <button className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink">
          Save handoff
        </button>
      </form>

      {handoff.status === "COMPLETE" && handoff.welcomeDraft ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Welcome draft</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Generated when handoff completed. {project.tasks.length} tasks on the board.
          </p>
          <CopyDraft text={handoff.welcomeDraft} />
        </section>
      ) : null}
    </div>
  );
}
