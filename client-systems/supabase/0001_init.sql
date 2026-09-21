-- Generated from prisma/schema.prisma via scripts/generate-supabase-sql.mjs
-- Dedicated Client Systems Supabase project (not Builder, not Neon).
-- Paste into SQL Editor, or run `npm run db:push` against DIRECT_URL instead.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slackWebhookUrl" TEXT,
    "inviteEmails" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "companyLegalName" TEXT,
    "website" TEXT,
    "industryOffer" TEXT,
    "companySize" TEXT,
    "clientOwnerName" TEXT,
    "clientOwnerTitle" TEXT,
    "clientOwnerEmail" TEXT,
    "clientOwnerPhone" TEXT,
    "dayToDayContact" TEXT,
    "billingContact" TEXT,
    "timezone" TEXT,
    "hours" TEXT,
    "endState" TEXT,
    "successMetric" TEXT,
    "secondaryOutcomes" TEXT,
    "failureDefinition" TEXT,
    "hardDeadline" TEXT,
    "deadlineReason" TEXT,
    "whatsWorking" TEXT,
    "whatsBroken" TEXT,
    "currentTools" TEXT,
    "priorWorkLinks" TEXT,
    "constraints" TEXT,
    "mustHaves" TEXT,
    "niceToHaves" TEXT,
    "knownOutOfScope" TEXT,
    "thirdParties" TEXT,
    "brandKitStatus" TEXT NOT NULL DEFAULT 'LATER',
    "brandKitUrl" TEXT,
    "analyticsAccessStatus" TEXT,
    "priorCreativeStatus" TEXT,
    "complianceNotes" TEXT,
    "preferredChannel" TEXT,
    "meetingPreference" TEXT,
    "clientFeedbackSla" TEXT,
    "changeApprover" TEXT,
    "hardNos" TEXT,
    "poRequired" TEXT,
    "invoiceEmail" TEXT,
    "paymentTermsConfirm" TEXT,
    "contractStatus" TEXT,
    "clientSideRisk" TEXT,
    "vendorWatchRisk" TEXT,
    "anythingElse" TEXT,
    "intakeCompletedBy" TEXT,
    "decisionSla" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "engagementName" TEXT NOT NULL,
    "dealId" TEXT,
    "proposalId" TEXT,
    "kickoffDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalInvestment" TEXT,
    "paymentTerms" TEXT,
    "accountLeadEmail" TEXT,
    "deliveryLeadEmail" TEXT,
    "billingOwnerEmail" TEXT,
    "projectTool" TEXT NOT NULL DEFAULT 'Client Systems',
    "primaryChannel" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'INTAKE',
    "handoffStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "accessDeadlineDay" INTEGER NOT NULL DEFAULT 5,
    "checkpointDay" INTEGER NOT NULL DEFAULT 7,
    "successMetric" TEXT,
    "inScope" TEXT,
    "outOfScope" TEXT,
    "milestones" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "boardColumn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "ownerRole" TEXT,
    "ownerEmail" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueRule" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceSection" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "canProvide" TEXT NOT NULL DEFAULT 'LATER',
    "url" TEXT,
    "notes" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "escalationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocker" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAction" TEXT,
    "due" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "completedByAccountLead" BOOLEAN NOT NULL DEFAULT false,
    "acceptedByDeliveryLead" BOOLEAN NOT NULL DEFAULT false,
    "accountLeadConfirmedAt" TIMESTAMP(3),
    "deliveryLeadConfirmedAt" TIMESTAMP(3),
    "risk1" TEXT,
    "risk2" TEXT,
    "risk3" TEXT,
    "commercialNotes" TEXT,
    "paymentNotes" TEXT,
    "scopePromises" TEXT,
    "kickoffAgendaNotes" TEXT,
    "proposalLink" TEXT,
    "contractLink" TEXT,
    "welcomeDraft" TEXT,
    "tasksSeededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "Task_projectId_boardColumn_idx" ON "Task"("projectId", "boardColumn");

-- CreateIndex
CREATE UNIQUE INDEX "Handoff_projectId_key" ON "Handoff"("projectId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessItem" ADD CONSTRAINT "AccessItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocker" ADD CONSTRAINT "Blocker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

