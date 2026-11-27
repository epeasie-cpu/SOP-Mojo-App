"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { submitQcPack } from "@/lib/qc-pack";
import { QC_PACK_PATH, QC_PACK_READY_PATH } from "@/lib/qc-pack-page";

export async function requestQcPack(formData: FormData) {
  const headerList = await headers();
  const result = await submitQcPack({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  if (!result.ok) redirect(`${QC_PACK_PATH}?error=${result.code}`);
  redirect(QC_PACK_READY_PATH);
}
