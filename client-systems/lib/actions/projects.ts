"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth";
import type { IntakePayload } from "@/lib/intake";
import {
  buildDefaultAccessSeeds,
  normalizeAccessStatus,
  slaDeadlineForAccessItem,
} from "@/lib/access-items";
import { completeHandoffIfReady, escalateOverdueAccessForProject } from "@/lib/automations";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createProjectFromIntake(payload: IntakePayload) {
  const { workspace, user } = await requireWorkspace();
  if (!payload.client.clientName.trim() || !payload.project.engagementName.trim()) {
    throw new Error("Client name and engagement name are required.");
  }

  const kickoffDate = parseDate(payload.project.kickoffDate);
  const endDate = parseDate(payload.project.endDate);
  const accessDeadlineDay = payload.project.accessDeadlineDay || 5;
  const brandKitStatus = payload.client.brandKitStatus || "LATER";

  const milestones = (payload.project.milestones ?? []).filter((item) => item.name.trim());

  const project = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        workspaceId: workspace.id,
        ...payload.client,
        clientName: payload.client.clientName.trim(),
        brandKitStatus,
        brandKitUrl: brandKitStatus === "YES" ? payload.client.brandKitUrl || null : null,
        intakeCompletedBy: payload.client.intakeCompletedBy || user.email,
      },
    });

    const created = await tx.project.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        engagementName: payload.project.engagementName.trim(),
        dealId: payload.project.dealId || null,
        proposalId: payload.project.proposalId || null,
        kickoffDate,
        endDate,
        totalInvestment: payload.project.totalInvestment || null,
        paymentTerms: payload.project.paymentTerms || payload.client.paymentTermsConfirm || null,
        accountLeadEmail: payload.project.accountLeadEmail || user.email,
        deliveryLeadEmail: payload.project.deliveryLeadEmail || user.email,
        billingOwnerEmail: payload.project.billingOwnerEmail || payload.client.invoiceEmail || user.email,
        projectTool: payload.project.projectTool || "Client Systems",
        primaryChannel: payload.project.primaryChannel || payload.client.preferredChannel || null,
        stage: "HANDOFF",
        handoffStatus: "DRAFT",
        accessDeadlineDay,
        checkpointDay: payload.project.checkpointDay || 7,
        successMetric: payload.project.successMetric || payload.client.successMetric || null,
        inScope: payload.project.inScope || payload.client.mustHaves || null,
        outOfScope: payload.project.outOfScope || payload.client.knownOutOfScope || null,
        milestones: JSON.stringify(milestones),
      },
    });

    await tx.handoff.create({
      data: {
        projectId: created.id,
        proposalLink: payload.project.proposalId || null,
      },
    });

    if (milestones.length) {
      await tx.deliverable.createMany({
        data: milestones.map((item, index) => ({
          projectId: created.id,
          sortOrder: index + 1,
          name: item.name.trim(),
          format: item.format || null,
          dueDate: parseDate(item.dueDate),
        })),
      });
    }

    const accessSeeds = buildDefaultAccessSeeds({
      kickoffDate,
      accessDeadlineDay,
      brandKitStatus,
      brandKitUrl: payload.client.brandKitUrl,
      analyticsAccessStatus: payload.client.analyticsAccessStatus,
      priorCreativeStatus: payload.client.priorCreativeStatus,
      currentTools: payload.client.currentTools,
    });

    await tx.accessItem.createMany({
      data: accessSeeds.map((item) => {
        const canProvide = normalizeAccessStatus(item.canProvide);
        return {
          projectId: created.id,
          itemName: item.itemName,
          canProvide,
          url: item.url || null,
          notes: item.notes || null,
          slaDeadline: slaDeadlineForAccessItem({
            kickoffDate,
            canProvide,
            itemName: item.itemName,
            laterOffsetDays: item.laterOffsetDays,
            brandKitStatus,
          }),
        };
      }),
    });

    return created;
  });

  redirect(`/app/projects/${project.id}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "TODO");
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
  });
  if (!task) return;
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });
  revalidatePath(`/app/projects/${task.projectId}/board`);
  revalidatePath(`/app/projects/${task.projectId}`);
}

export async function saveHandoffAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const projectId = String(formData.get("projectId") ?? "");
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    include: { handoff: true },
  });
  if (!project?.handoff) return;

  const confirmAccount = formData.get("completedByAccountLead") === "on";
  const confirmDelivery = formData.get("acceptedByDeliveryLead") === "on";

  await prisma.handoff.update({
    where: { id: project.handoff.id },
    data: {
      risk1: String(formData.get("risk1") ?? "") || null,
      risk2: String(formData.get("risk2") ?? "") || null,
      risk3: String(formData.get("risk3") ?? "") || null,
      commercialNotes: String(formData.get("commercialNotes") ?? "") || null,
      paymentNotes: String(formData.get("paymentNotes") ?? "") || null,
      scopePromises: String(formData.get("scopePromises") ?? "") || null,
      kickoffAgendaNotes: String(formData.get("kickoffAgendaNotes") ?? "") || null,
      proposalLink: String(formData.get("proposalLink") ?? "") || null,
      contractLink: String(formData.get("contractLink") ?? "") || null,
      completedByAccountLead: confirmAccount,
      acceptedByDeliveryLead: confirmDelivery,
      accountLeadConfirmedAt: confirmAccount
        ? project.handoff.accountLeadConfirmedAt ?? new Date()
        : null,
      deliveryLeadConfirmedAt: confirmDelivery
        ? project.handoff.deliveryLeadConfirmedAt ?? new Date()
        : null,
      status: confirmAccount && confirmDelivery ? "COMPLETE" : "DRAFT",
    },
  });

  if (confirmAccount && confirmDelivery) {
    await completeHandoffIfReady(projectId);
  }

  revalidatePath(`/app/projects/${projectId}/handoff`);
  revalidatePath(`/app/projects/${projectId}/board`);
  revalidatePath(`/app/projects/${projectId}`);
}

export async function updateAccessItemAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await prisma.accessItem.findFirst({
    where: { id: itemId, project: { workspaceId: workspace.id } },
    include: { project: true },
  });
  if (!item) return;

  const canProvide = String(formData.get("canProvide") ?? item.canProvide);
  const received = formData.get("received") === "on";
  const url = String(formData.get("url") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  await prisma.accessItem.update({
    where: { id: itemId },
    data: {
      canProvide,
      url,
      notes,
      receivedAt: received ? item.receivedAt ?? new Date() : null,
      slaDeadline: slaDeadlineForAccessItem({
        kickoffDate: item.project.kickoffDate,
        canProvide,
        itemName: item.itemName,
        laterOffsetDays:
          item.itemName === "Brand kit" ? 3 : item.project.accessDeadlineDay,
        brandKitStatus: canProvide,
      }),
    },
  });

  revalidatePath(`/app/projects/${item.projectId}/access`);
}

export async function addAccessItemAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const projectId = String(formData.get("projectId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();
  if (!itemName) return;
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });
  if (!project) return;
  const canProvide = String(formData.get("canProvide") ?? "LATER");
  await prisma.accessItem.create({
    data: {
      projectId,
      itemName,
      canProvide,
      notes: String(formData.get("notes") ?? "") || null,
      slaDeadline: slaDeadlineForAccessItem({
        kickoffDate: project.kickoffDate,
        canProvide,
        itemName,
        laterOffsetDays: project.accessDeadlineDay,
        brandKitStatus: canProvide,
      }),
    },
  });
  revalidatePath(`/app/projects/${projectId}/access`);
}

export async function runAccessEscalationAction(projectId: string) {
  const { workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });
  if (!project) return { created: 0 };
  const result = await escalateOverdueAccessForProject(projectId);
  revalidatePath(`/app/projects/${projectId}/access`);
  revalidatePath(`/app/projects/${projectId}/board`);
  return result;
}

export async function addBlockerAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const projectId = String(formData.get("projectId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });
  if (!project) return;
  await prisma.blocker.create({
    data: {
      projectId,
      description,
      ownerEmail: String(formData.get("ownerEmail") ?? "") || project.accountLeadEmail,
      nextAction: String(formData.get("nextAction") ?? "") || null,
      due: parseDate(String(formData.get("due") ?? "")),
    },
  });
  revalidatePath(`/app/projects/${projectId}`);
}
