export type WelcomeDraftInput = {
  engagementName: string;
  clientName: string;
  clientOwnerName?: string | null;
  kickoffDate?: Date | null;
  successMetric?: string | null;
  endState?: string | null;
  accountLeadEmail?: string | null;
  deliveryLeadEmail?: string | null;
  primaryChannel?: string | null;
  accessDeadline?: Date | null;
};

function fmtDate(value?: Date | null): string {
  if (!value) return "(not set)";
  return value.toISOString().slice(0, 10);
}

export function generateWelcomeDraft(input: WelcomeDraftInput): string {
  const who = input.clientOwnerName?.trim() || input.clientName;
  return `Subject: Welcome — ${input.engagementName}

${who} —

Handoff is complete for ${input.engagementName} (${input.clientName}).
Kickoff: ${fmtDate(input.kickoffDate)}.

Success looks like: ${input.successMetric?.trim() || "(add the success metric)"}
End state: ${input.endState?.trim() || "(add the end state)"}

Account lead: ${input.accountLeadEmail || "(assign)"}
Delivery lead: ${input.deliveryLeadEmail || "(assign)"}
Primary channel: ${input.primaryChannel || "(lock in kickoff)"}

Send outstanding access items before ${fmtDate(input.accessDeadline)}.
Reply in this thread if a date will slip — do not wait for the meeting.

This draft lives in Client Systems. Copy it into your channel; v1 does not send email.

— SOP Mojo Client Systems`;
}
