import { notFound } from "next/navigation";
import { ProjectNav } from "@/components/ProjectNav";
import { StatusButtons } from "@/components/StatusButtons";
import { requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BOARD_COLUMNS } from "@/lib/seed-tasks";
import { escalateOverdueAccessForProject } from "@/lib/automations";

const COLUMN_LABEL: Record<string, string> = {
  PRE_KICKOFF: "Pre-kickoff",
  KICKOFF_DAY: "Kickoff day",
  WEEK_1: "Week 1",
  STABILIZE: "Stabilize",
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  await escalateOverdueAccessForProject(id);
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { client: true, tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{project.engagementName}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        {project.client.clientName}. Board seeds when handoff is Complete.
      </p>
      <ProjectNav projectId={project.id} current="/board" />

      {project.tasks.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
          No tasks yet. Complete the handoff (account lead + delivery lead) to seed the 31 Blueprint A tasks.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {BOARD_COLUMNS.map((column) => {
            const tasks = project.tasks.filter((task) => task.boardColumn === column);
            return (
              <section key={column} className="rounded-lg border border-line bg-paper p-3">
                <h2 className="text-sm font-semibold">
                  {COLUMN_LABEL[column]}{" "}
                  <span className="text-muted">({tasks.length})</span>
                </h2>
                <ul className="mt-3 space-y-3">
                  {tasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-line bg-white p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {task.ownerRole}
                        {task.ownerEmail ? ` · ${task.ownerEmail}` : ""}
                        {task.dueDate ? ` · ${task.dueDate.toISOString().slice(0, 10)}` : ""}
                      </p>
                      <div className="mt-2">
                        <StatusButtons taskId={task.id} current={task.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
