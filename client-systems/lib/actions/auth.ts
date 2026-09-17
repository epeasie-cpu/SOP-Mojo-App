"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSession,
  createSession,
  parseInviteEmails,
  requireWorkspace,
  serializeInviteEmails,
} from "@/lib/auth";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signupAction(formData: FormData) {
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const name = formString(formData, "name") || email.split("@")[0];
  const workspaceName = formString(formData, "workspaceName") || `${name}'s workspace`;

  if (!email || !password || password.length < 8) {
    redirect("/signup?error=Use%20a%20valid%20email%20and%20an%208%2B%20character%20password.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/signup?error=That%20email%20already%20has%20an%20account.%20Log%20in.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const invitedWorkspace = await prisma.workspace.findFirst({
    where: { inviteEmails: { contains: email } },
  });
  const matchedInvite =
    invitedWorkspace && parseInviteEmails(invitedWorkspace.inviteEmails).includes(email)
      ? invitedWorkspace
      : null;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      memberships: matchedInvite
        ? { create: { role: "MEMBER", workspaceId: matchedInvite.id } }
        : {
            create: {
              role: "OWNER",
              workspace: { create: { name: workspaceName } },
            },
          },
    },
  });

  await createSession(user.id);
  redirect("/app");
}

export async function loginAction(formData: FormData) {
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const next = formString(formData, "next") || "/app";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=Email%20or%20password%20is%20wrong.");
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/app");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const { workspace, membership } = await requireWorkspace();
  if (membership.role !== "OWNER" && membership.role !== "MEMBER") {
    redirect("/app/settings?error=Not%20allowed.");
  }

  const name = formString(formData, "name") || workspace.name;
  const slackWebhookUrl = formString(formData, "slackWebhookUrl") || null;
  const inviteRaw = formString(formData, "inviteEmails");
  const inviteEmails = serializeInviteEmails(
    inviteRaw.split(/[,;\n]+/).map((value) => value.trim()),
  );

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { name, slackWebhookUrl, inviteEmails },
  });

  redirect("/app/settings?saved=1");
}
