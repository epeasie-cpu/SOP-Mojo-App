import { updateTaskStatusAction } from "@/lib/actions/projects";
import { TASK_STATUSES } from "@/lib/seed-tasks";

export function StatusButtons({ taskId, current }: { taskId: string; current: string }) {
  return (
    <form action={updateTaskStatusAction} className="flex flex-wrap gap-1">
      <input type="hidden" name="taskId" value={taskId} />
      {TASK_STATUSES.map((status) => (
        <button
          key={status}
          name="status"
          value={status}
          className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold ${
            current === status
              ? "bg-forest text-white"
              : "border border-line bg-white text-muted hover:border-forest"
          }`}
        >
          {status}
        </button>
      ))}
    </form>
  );
}
