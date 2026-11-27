"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { performUnsubscribe } from "@/lib/unsubscribe";

export async function confirmUnsubscribe(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const headerList = await headers();
  const result = await performUnsubscribe({
    token,
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  if (result === "invalid") redirect("/unsubscribe?error=invalid");
  if (result === "rate") redirect("/unsubscribe?error=rate");
  redirect("/unsubscribe?done=1");
}
