"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { aupFormReturnPath } from "@/lib/aup-landing";
import { clientIpFromHeaders, FREE_AUP_READY_PATH, submitFreeAup } from "@/lib/aup-free";

export async function requestFreeAup(formData: FormData) {
  const headerList = await headers();
  const result = await submitFreeAup({
    email: String(formData.get("email") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    company: String(formData.get("company") ?? ""),
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  const returnPath = aupFormReturnPath(formData.get("return"));
  if (!result.ok) redirect(`${returnPath}?error=${result.code}`);
  redirect(FREE_AUP_READY_PATH);
}
