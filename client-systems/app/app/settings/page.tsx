import { updateWorkspaceSettingsAction } from "@/lib/actions/auth";
import { parseInviteEmails, requireWorkspace } from "@/lib/auth";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const invites = parseInviteEmails(workspace.inviteEmails).join("\n");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold">Workspace</h1>
      <p className="mt-1 text-sm text-muted">
        Invite teammates by email (v1: they join this workspace on signup). Optional Slack
        webhook receives handoff and access-escalation posts.
      </p>
      {params.saved ? (
        <p className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-sm">Saved.</p>
      ) : null}
      {params.error ? (
        <p className="mt-4 text-sm text-red-700">{params.error}</p>
      ) : null}
      <form action={updateWorkspaceSettingsAction} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Workspace name</span>
          <input
            name="name"
            defaultValue={workspace.name}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Invite emails (one per line)</span>
          <textarea
            name="inviteEmails"
            rows={6}
            defaultValue={invites}
            className="w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Slack webhook URL</span>
          <input
            name="slackWebhookUrl"
            defaultValue={workspace.slackWebhookUrl ?? ""}
            placeholder="https://hooks.slack.com/..."
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <button className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink">
          Save settings
        </button>
      </form>
    </div>
  );
}
