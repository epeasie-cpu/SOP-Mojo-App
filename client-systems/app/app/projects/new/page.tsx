import { IntakeWizard } from "@/components/IntakeWizard";
import { requireWorkspace } from "@/lib/auth";

export default async function NewProjectPage() {
  const { user } = await requireWorkspace();
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">New project</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted">
        Intake first. Handoff is the gate. Do not seed the board until both
        account lead and delivery lead confirm.
      </p>
      <IntakeWizard defaultEmail={user.email} />
    </div>
  );
}
