"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { submitCptKit } from "@/lib/cpt-kit";
import { CPT_KIT_PATH, CPT_KIT_READY_PATH } from "@/lib/cpt-kit-page";

export async function requestCptKit(formData: FormData) {
  const headerList = await headers();
  const result = await submitCptKit({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  if (!result.ok) redirect(`${CPT_KIT_PATH}?error=${result.code}`);
  redirect(CPT_KIT_READY_PATH);
}
