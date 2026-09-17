"use client";

import { useState } from "react";
import { createProjectFromIntake } from "@/lib/actions/projects";
import { emptyIntake, type IntakePayload } from "@/lib/intake";

const STEPS = [
  "Client",
  "People",
  "Outcomes",
  "Scope",
  "Access",
  "Engagement",
] as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest";

export function IntakeWizard({ defaultEmail }: { defaultEmail: string }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [data, setData] = useState<IntakePayload>(() => emptyIntake({ email: defaultEmail }));

  function patchClient(patch: Partial<IntakePayload["client"]>) {
    setData((prev) => ({ ...prev, client: { ...prev.client, ...patch } }));
  }
  function patchProject(patch: Partial<IntakePayload["project"]>) {
    setData((prev) => ({ ...prev, project: { ...prev.project, ...patch } }));
  }

  async function onSubmit() {
    setError(null);
    if (!data.client.clientName.trim() || !data.project.engagementName.trim()) {
      setError("Client name and engagement name are required.");
      setStep(data.client.clientName.trim() ? 5 : 0);
      return;
    }
    if (data.client.brandKitStatus === "YES" && !data.client.brandKitUrl?.trim()) {
      setError("Brand kit is Yes — add the URL.");
      setStep(4);
      return;
    }
    setPending(true);
    try {
      await createProjectFromIntake(data);
    } catch (caught) {
      const digest = typeof caught === "object" && caught && "digest" in caught
        ? String((caught as { digest?: string }).digest)
        : "";
      if (digest.startsWith("NEXT_REDIRECT")) throw caught;
      setError(caught instanceof Error ? caught.message : "Could not create the project.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4 sm:p-6">
      <ol className="mb-6 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`w-full rounded-sm px-2 py-1 ${
                index === step ? "bg-forest text-white" : "bg-paper text-muted"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name *">
            <input className={inputClass} value={data.client.clientName} onChange={(e) => patchClient({ clientName: e.target.value })} />
          </Field>
          <Field label="Legal company name">
            <input className={inputClass} value={data.client.companyLegalName ?? ""} onChange={(e) => patchClient({ companyLegalName: e.target.value })} />
          </Field>
          <Field label="Website">
            <input className={inputClass} value={data.client.website ?? ""} onChange={(e) => patchClient({ website: e.target.value })} />
          </Field>
          <Field label="Industry / offer">
            <input className={inputClass} value={data.client.industryOffer ?? ""} onChange={(e) => patchClient({ industryOffer: e.target.value })} />
          </Field>
          <Field label="Company size">
            <input className={inputClass} value={data.client.companySize ?? ""} onChange={(e) => patchClient({ companySize: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <input className={inputClass} value={data.client.timezone ?? ""} onChange={(e) => patchClient({ timezone: e.target.value })} />
          </Field>
          <Field label="Working hours">
            <input className={inputClass} value={data.client.hours ?? ""} onChange={(e) => patchClient({ hours: e.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client owner name">
            <input className={inputClass} value={data.client.clientOwnerName ?? ""} onChange={(e) => patchClient({ clientOwnerName: e.target.value })} />
          </Field>
          <Field label="Owner title">
            <input className={inputClass} value={data.client.clientOwnerTitle ?? ""} onChange={(e) => patchClient({ clientOwnerTitle: e.target.value })} />
          </Field>
          <Field label="Owner email">
            <input className={inputClass} type="email" value={data.client.clientOwnerEmail ?? ""} onChange={(e) => patchClient({ clientOwnerEmail: e.target.value })} />
          </Field>
          <Field label="Owner phone">
            <input className={inputClass} value={data.client.clientOwnerPhone ?? ""} onChange={(e) => patchClient({ clientOwnerPhone: e.target.value })} />
          </Field>
          <Field label="Day-to-day contact">
            <input className={inputClass} value={data.client.dayToDayContact ?? ""} onChange={(e) => patchClient({ dayToDayContact: e.target.value })} />
          </Field>
          <Field label="Billing contact">
            <input className={inputClass} value={data.client.billingContact ?? ""} onChange={(e) => patchClient({ billingContact: e.target.value })} />
          </Field>
          <Field label="Change approver">
            <input className={inputClass} value={data.client.changeApprover ?? ""} onChange={(e) => patchClient({ changeApprover: e.target.value })} />
          </Field>
          <Field label="Preferred channel">
            <input className={inputClass} value={data.client.preferredChannel ?? ""} onChange={(e) => patchClient({ preferredChannel: e.target.value })} />
          </Field>
          <Field label="Meeting preference">
            <input className={inputClass} value={data.client.meetingPreference ?? ""} onChange={(e) => patchClient({ meetingPreference: e.target.value })} />
          </Field>
          <Field label="Client feedback SLA">
            <input className={inputClass} value={data.client.clientFeedbackSla ?? ""} onChange={(e) => patchClient({ clientFeedbackSla: e.target.value })} />
          </Field>
          <Field label="Decision SLA">
            <input className={inputClass} value={data.client.decisionSla ?? ""} onChange={(e) => patchClient({ decisionSla: e.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4">
          <Field label="End state">
            <textarea className={inputClass} rows={3} value={data.client.endState ?? ""} onChange={(e) => patchClient({ endState: e.target.value })} />
          </Field>
          <Field label="Success metric">
            <textarea className={inputClass} rows={2} value={data.client.successMetric ?? ""} onChange={(e) => patchClient({ successMetric: e.target.value })} />
          </Field>
          <Field label="Secondary outcomes">
            <textarea className={inputClass} rows={2} value={data.client.secondaryOutcomes ?? ""} onChange={(e) => patchClient({ secondaryOutcomes: e.target.value })} />
          </Field>
          <Field label="Failure definition">
            <textarea className={inputClass} rows={2} value={data.client.failureDefinition ?? ""} onChange={(e) => patchClient({ failureDefinition: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hard deadline">
              <input className={inputClass} value={data.client.hardDeadline ?? ""} onChange={(e) => patchClient({ hardDeadline: e.target.value })} />
            </Field>
            <Field label="Deadline reason">
              <input className={inputClass} value={data.client.deadlineReason ?? ""} onChange={(e) => patchClient({ deadlineReason: e.target.value })} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What's working">
            <textarea className={inputClass} rows={3} value={data.client.whatsWorking ?? ""} onChange={(e) => patchClient({ whatsWorking: e.target.value })} />
          </Field>
          <Field label="What's broken">
            <textarea className={inputClass} rows={3} value={data.client.whatsBroken ?? ""} onChange={(e) => patchClient({ whatsBroken: e.target.value })} />
          </Field>
          <Field label="Current tools">
            <textarea className={inputClass} rows={2} value={data.client.currentTools ?? ""} onChange={(e) => patchClient({ currentTools: e.target.value })} />
          </Field>
          <Field label="Prior work links">
            <textarea className={inputClass} rows={2} value={data.client.priorWorkLinks ?? ""} onChange={(e) => patchClient({ priorWorkLinks: e.target.value })} />
          </Field>
          <Field label="Constraints">
            <textarea className={inputClass} rows={2} value={data.client.constraints ?? ""} onChange={(e) => patchClient({ constraints: e.target.value })} />
          </Field>
          <Field label="Must-haves">
            <textarea className={inputClass} rows={2} value={data.client.mustHaves ?? ""} onChange={(e) => patchClient({ mustHaves: e.target.value })} />
          </Field>
          <Field label="Nice-to-haves">
            <textarea className={inputClass} rows={2} value={data.client.niceToHaves ?? ""} onChange={(e) => patchClient({ niceToHaves: e.target.value })} />
          </Field>
          <Field label="Known out of scope">
            <textarea className={inputClass} rows={2} value={data.client.knownOutOfScope ?? ""} onChange={(e) => patchClient({ knownOutOfScope: e.target.value })} />
          </Field>
          <Field label="Third parties">
            <input className={inputClass} value={data.client.thirdParties ?? ""} onChange={(e) => patchClient({ thirdParties: e.target.value })} />
          </Field>
          <Field label="Hard nos">
            <input className={inputClass} value={data.client.hardNos ?? ""} onChange={(e) => patchClient({ hardNos: e.target.value })} />
          </Field>
          <Field label="Compliance notes">
            <textarea className={inputClass} rows={2} value={data.client.complianceNotes ?? ""} onChange={(e) => patchClient({ complianceNotes: e.target.value })} />
          </Field>
          <Field label="Anything else">
            <textarea className={inputClass} rows={2} value={data.client.anythingElse ?? ""} onChange={(e) => patchClient({ anythingElse: e.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand kit status">
            <select
              className={inputClass}
              value={data.client.brandKitStatus}
              onChange={(e) =>
                patchClient({ brandKitStatus: e.target.value as IntakePayload["client"]["brandKitStatus"] })
              }
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="LATER">Later (SLA = kickoff + 3 days)</option>
            </select>
          </Field>
          {data.client.brandKitStatus === "YES" ? (
            <Field label="Brand kit URL">
              <input
                className={inputClass}
                value={data.client.brandKitUrl ?? ""}
                onChange={(e) => patchClient({ brandKitUrl: e.target.value })}
                placeholder="https://"
              />
            </Field>
          ) : (
            <p className="self-end text-sm text-muted">
              {data.client.brandKitStatus === "LATER"
                ? "Pending brand kit will get a 3-day post-kickoff SLA."
                : "No brand kit expected. Logged as cannot provide."}
            </p>
          )}
          <Field label="Analytics access">
            <select
              className={inputClass}
              value={data.client.analyticsAccessStatus ?? "LATER"}
              onChange={(e) =>
                patchClient({ analyticsAccessStatus: e.target.value as IntakePayload["client"]["analyticsAccessStatus"] })
              }
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="LATER">Later</option>
            </select>
          </Field>
          <Field label="Prior creative">
            <select
              className={inputClass}
              value={data.client.priorCreativeStatus ?? "LATER"}
              onChange={(e) =>
                patchClient({ priorCreativeStatus: e.target.value as IntakePayload["client"]["priorCreativeStatus"] })
              }
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="LATER">Later</option>
            </select>
          </Field>
          <Field label="Client-side risk">
            <textarea className={inputClass} rows={2} value={data.client.clientSideRisk ?? ""} onChange={(e) => patchClient({ clientSideRisk: e.target.value })} />
          </Field>
          <Field label="Vendor watch risk">
            <textarea className={inputClass} rows={2} value={data.client.vendorWatchRisk ?? ""} onChange={(e) => patchClient({ vendorWatchRisk: e.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Engagement name *">
            <input className={inputClass} value={data.project.engagementName} onChange={(e) => patchProject({ engagementName: e.target.value })} />
          </Field>
          <Field label="Intake completed by">
            <input className={inputClass} value={data.client.intakeCompletedBy ?? ""} onChange={(e) => patchClient({ intakeCompletedBy: e.target.value })} />
          </Field>
          <Field label="Deal ID">
            <input className={inputClass} value={data.project.dealId ?? ""} onChange={(e) => patchProject({ dealId: e.target.value })} />
          </Field>
          <Field label="Proposal ID / link">
            <input className={inputClass} value={data.project.proposalId ?? ""} onChange={(e) => patchProject({ proposalId: e.target.value })} />
          </Field>
          <Field label="Kickoff date">
            <input className={inputClass} type="date" value={data.project.kickoffDate ?? ""} onChange={(e) => patchProject({ kickoffDate: e.target.value })} />
          </Field>
          <Field label="End date">
            <input className={inputClass} type="date" value={data.project.endDate ?? ""} onChange={(e) => patchProject({ endDate: e.target.value })} />
          </Field>
          <Field label="Total investment">
            <input className={inputClass} value={data.project.totalInvestment ?? ""} onChange={(e) => patchProject({ totalInvestment: e.target.value })} />
          </Field>
          <Field label="Payment terms">
            <input className={inputClass} value={data.project.paymentTerms ?? ""} onChange={(e) => patchProject({ paymentTerms: e.target.value })} />
          </Field>
          <Field label="PO required">
            <input className={inputClass} value={data.client.poRequired ?? ""} onChange={(e) => patchClient({ poRequired: e.target.value })} />
          </Field>
          <Field label="Invoice email">
            <input className={inputClass} value={data.client.invoiceEmail ?? ""} onChange={(e) => patchClient({ invoiceEmail: e.target.value })} />
          </Field>
          <Field label="Payment terms confirm">
            <input className={inputClass} value={data.client.paymentTermsConfirm ?? ""} onChange={(e) => patchClient({ paymentTermsConfirm: e.target.value })} />
          </Field>
          <Field label="Contract status">
            <input className={inputClass} value={data.client.contractStatus ?? ""} onChange={(e) => patchClient({ contractStatus: e.target.value })} />
          </Field>
          <Field label="Account lead email">
            <input className={inputClass} type="email" value={data.project.accountLeadEmail ?? ""} onChange={(e) => patchProject({ accountLeadEmail: e.target.value })} />
          </Field>
          <Field label="Delivery lead email">
            <input className={inputClass} type="email" value={data.project.deliveryLeadEmail ?? ""} onChange={(e) => patchProject({ deliveryLeadEmail: e.target.value })} />
          </Field>
          <Field label="Billing owner email">
            <input className={inputClass} type="email" value={data.project.billingOwnerEmail ?? ""} onChange={(e) => patchProject({ billingOwnerEmail: e.target.value })} />
          </Field>
          <Field label="Primary channel">
            <input className={inputClass} value={data.project.primaryChannel ?? ""} onChange={(e) => patchProject({ primaryChannel: e.target.value })} />
          </Field>
          <Field label="Access deadline (days after kickoff)">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={data.project.accessDeadlineDay ?? 5}
              onChange={(e) => patchProject({ accessDeadlineDay: Number(e.target.value) })}
            />
          </Field>
          <Field label="Checkpoint day">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={data.project.checkpointDay ?? 7}
              onChange={(e) => patchProject({ checkpointDay: Number(e.target.value) })}
            />
          </Field>
          <Field label="In scope">
            <textarea className={inputClass} rows={2} value={data.project.inScope ?? ""} onChange={(e) => patchProject({ inScope: e.target.value })} />
          </Field>
          <Field label="Out of scope">
            <textarea className={inputClass} rows={2} value={data.project.outOfScope ?? ""} onChange={(e) => patchProject({ outOfScope: e.target.value })} />
          </Field>
          {(data.project.milestones ?? []).map((milestone, index) => (
            <Field key={index} label={`Milestone ${index + 1}`}>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className={inputClass}
                  placeholder="Name"
                  value={milestone.name}
                  onChange={(e) => {
                    const milestones = [...(data.project.milestones ?? [])];
                    milestones[index] = { ...milestone, name: e.target.value };
                    patchProject({ milestones });
                  }}
                />
                <input
                  className={inputClass}
                  placeholder="Format"
                  value={milestone.format ?? ""}
                  onChange={(e) => {
                    const milestones = [...(data.project.milestones ?? [])];
                    milestones[index] = { ...milestone, format: e.target.value };
                    patchProject({ milestones });
                  }}
                />
                <input
                  className={inputClass}
                  type="date"
                  value={milestone.dueDate ?? ""}
                  onChange={(e) => {
                    const milestones = [...(data.project.milestones ?? [])];
                    milestones[index] = { ...milestone, dueDate: e.target.value };
                    patchProject({ milestones });
                  }}
                />
              </div>
            </Field>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-sm border border-line px-4 py-2 text-sm disabled:opacity-40"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="rounded-sm bg-forest px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink disabled:opacity-60"
            onClick={onSubmit}
          >
            {pending ? "Saving…" : "Create project"}
          </button>
        )}
      </div>
    </div>
  );
}
