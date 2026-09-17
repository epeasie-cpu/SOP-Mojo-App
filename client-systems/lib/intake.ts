export type MilestoneInput = {
  name: string;
  format?: string;
  dueDate?: string;
};

export type IntakePayload = {
  client: {
    clientName: string;
    companyLegalName?: string;
    website?: string;
    industryOffer?: string;
    companySize?: string;
    clientOwnerName?: string;
    clientOwnerTitle?: string;
    clientOwnerEmail?: string;
    clientOwnerPhone?: string;
    dayToDayContact?: string;
    billingContact?: string;
    timezone?: string;
    hours?: string;
    endState?: string;
    successMetric?: string;
    secondaryOutcomes?: string;
    failureDefinition?: string;
    hardDeadline?: string;
    deadlineReason?: string;
    whatsWorking?: string;
    whatsBroken?: string;
    currentTools?: string;
    priorWorkLinks?: string;
    constraints?: string;
    mustHaves?: string;
    niceToHaves?: string;
    knownOutOfScope?: string;
    thirdParties?: string;
    brandKitStatus: "YES" | "NO" | "LATER";
    brandKitUrl?: string;
    analyticsAccessStatus?: "YES" | "NO" | "LATER" | "";
    priorCreativeStatus?: "YES" | "NO" | "LATER" | "";
    complianceNotes?: string;
    preferredChannel?: string;
    meetingPreference?: string;
    clientFeedbackSla?: string;
    changeApprover?: string;
    hardNos?: string;
    poRequired?: string;
    invoiceEmail?: string;
    paymentTermsConfirm?: string;
    contractStatus?: string;
    clientSideRisk?: string;
    vendorWatchRisk?: string;
    anythingElse?: string;
    intakeCompletedBy?: string;
    decisionSla?: string;
  };
  project: {
    engagementName: string;
    dealId?: string;
    proposalId?: string;
    kickoffDate?: string;
    endDate?: string;
    totalInvestment?: string;
    paymentTerms?: string;
    accountLeadEmail?: string;
    deliveryLeadEmail?: string;
    billingOwnerEmail?: string;
    projectTool?: string;
    primaryChannel?: string;
    accessDeadlineDay?: number;
    checkpointDay?: number;
    successMetric?: string;
    inScope?: string;
    outOfScope?: string;
    milestones?: MilestoneInput[];
  };
};

export function emptyIntake(defaults?: { email?: string }): IntakePayload {
  return {
    client: {
      clientName: "",
      brandKitStatus: "LATER",
      analyticsAccessStatus: "LATER",
      priorCreativeStatus: "LATER",
      intakeCompletedBy: defaults?.email ?? "",
    },
    project: {
      engagementName: "",
      accountLeadEmail: defaults?.email ?? "",
      deliveryLeadEmail: defaults?.email ?? "",
      billingOwnerEmail: defaults?.email ?? "",
      projectTool: "Client Systems",
      accessDeadlineDay: 5,
      checkpointDay: 7,
      milestones: [
        { name: "", format: "", dueDate: "" },
        { name: "", format: "", dueDate: "" },
        { name: "", format: "", dueDate: "" },
      ],
    },
  };
}
