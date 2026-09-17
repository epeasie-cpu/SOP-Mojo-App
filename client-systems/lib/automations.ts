import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { postSlackWebhook } from "./slack";
import {
  BLUEPRINT_A_SOURCE,
  buildSeededTaskRows,
} from "./seed-tasks";
import { generateWelcomeDraft } from "./welcome-draft";
import { buildEscalationTask, selectOverdueAccessItems } from "./escalate";
import { addUtcDays } from "./seed-tasks";

export async function seedBlueprintATasks(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, handoff: true, tasks: true, accessItems: true },
  });
  if (!project) throw new Error("Project not found");

  const alreadySeeded = project.tasks.some((task) =>
    task.sourceSection?.startsWith(`${BLUEPRINT_A_SOURCE}:`),
  );
  if (alreadySeeded) {
    return { seeded: false, count: 0 };
  }

  const rows = buildSeededTaskRows({
    kickoffDate: project.kickoffDate,
    accountLeadEmail: project.accountLeadEmail,
    deliveryLeadEmail: project.deliveryLeadEmail,
    billingOwnerEmail: project.billingOwnerEmail,
  });

  await prisma.task.createMany({
    data: rows.map((row) => ({ ...row, projectId })),
  });

  const accessDeadline = project.kickoffDate
    ? addUtcDays(project.kickoffDate, project.accessDeadlineDay)
    : null;

  const welcomeDraft = generateWelcomeDraft({
    engagementName: project.engagementName,
    clientName: project.client.clientName,
    clientOwnerName: project.client.clientOwnerName,
    kickoffDate: project.kickoffDate,
    successMetric: project.successMetric ?? project.client.successMetric,
    endState: project.client.endState,
    accountLeadEmail: project.accountLeadEmail,
    deliveryLeadEmail: project.deliveryLeadEmail,
    primaryChannel: project.primaryChannel ?? project.client.preferredChannel,
    accessDeadline,
  });

  if (project.handoff) {
    await prisma.handoff.update({
      where: { id: project.handoff.id },
      data: { welcomeDraft, tasksSeededAt: new Date(), status: "COMPLETE" },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "ONBOARDING", handoffStatus: "COMPLETE" },
  });

  return { seeded: true, count: rows.length, welcomeDraft };
}

export async function completeHandoffIfReady(projectId: string) {
  const handoff = await prisma.handoff.findUnique({
    where: { projectId },
    include: { project: { include: { workspace: true, client: true } } },
  });
  if (!handoff) throw new Error("Handoff not found");
  if (!handoff.completedByAccountLead || !handoff.acceptedByDeliveryLead) {
    return { complete: false as const, handoff };
  }

  const updated = await prisma.handoff.update({
    where: { id: handoff.id },
    data: { status: "COMPLETE" },
  });

  const seed = await seedBlueprintATasks(projectId);
  await postSlackWebhook(
    handoff.project.workspace.slackWebhookUrl,
    `Handoff complete: ${handoff.project.engagementName} (${handoff.project.client.clientName}). ${seed.count} onboarding tasks seeded.`,
  );
  return { complete: true as const, handoff: updated, seed };
}

export async function escalateOverdueAccessForProject(
  projectId: string,
  now = new Date(),
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { accessItems: true, workspace: true, client: true },
  });
  if (!project) return { created: 0 };

  const overdue = selectOverdueAccessItems(project.accessItems, now);
  let created = 0;

  for (const item of overdue) {
    const draft = buildEscalationTask(item);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.task.create({
        data: {
          projectId,
          title: draft.title,
          boardColumn: draft.boardColumn,
          status: draft.status,
          ownerRole: draft.ownerRole,
          ownerEmail: project.accountLeadEmail,
          dueDate: now,
          dueRule: "sla+0",
          sortOrder: 900 + created,
          sourceSection: draft.sourceSection,
        },
      });
      await tx.blocker.create({
        data: {
          projectId,
          description: `${item.itemName} access is overdue (SLA ${item.slaDeadline?.toISOString().slice(0, 10) ?? "unset"}).`,
          ownerEmail: project.accountLeadEmail,
          nextAction: "Escalate to the day-to-day contact and change approver.",
          due: now,
          status: "OPEN",
        },
      });
      await tx.accessItem.update({
        where: { id: item.id },
        data: { escalationSent: true },
      });
    });
    created += 1;
    await postSlackWebhook(
      project.workspace.slackWebhookUrl,
      `Access SLA overdue on ${project.engagementName}: ${item.itemName}. Escalation task created for ${project.accountLeadEmail ?? "Account Lead"}.`,
    );
  }

  return { created };
}

export async function escalateAllOverdueAccess(now = new Date()) {
  const projects = await prisma.project.findMany({ select: { id: true } });
  let created = 0;
  for (const project of projects) {
    const result = await escalateOverdueAccessForProject(project.id, now);
    created += result.created;
  }
  return { projects: projects.length, created };
}
