"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { FOUNDER_TRAP_READY_PATH, founderTrapDownloadToken, submitFreeFounderTrap } from "@/lib/founder-trap";
import { FOUNDER_TRAP_PATH } from "@/lib/founder-trap-page";

export async function requestFreeFounderTrap(formData: FormData) {
  const headerList = await headers();
  const result = await submitFreeFounderTrap({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  if (!result.ok) redirect(`${FOUNDER_TRAP_PATH}?error=${result.code}`);
  const token = founderTrapDownloadToken(result.downloadToken ?? undefined);
  if (token) redirect(`${FOUNDER_TRAP_READY_PATH}?download=${encodeURIComponent(token)}`);
  redirect(FOUNDER_TRAP_READY_PATH);
}
