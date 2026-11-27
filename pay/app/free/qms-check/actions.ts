"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { QMS_QUESTIONS } from "@/lib/qms-score";
import { QMS_READY_PATH } from "@/lib/qms-page";
import { submitQmsCheck } from "@/lib/qms-check";

export async function requestQmsPlan(formData: FormData): Promise<{ ok: false; code: "email" | "name" | "answers" | "rate" | "send" } | undefined> {
  const headerList = await headers();
  const answers: Record<string, string> = {};
  for (const question of QMS_QUESTIONS) {
    answers[question.id] = String(formData.get(question.id) ?? "");
  }
  const result = await submitQmsCheck({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    answers,
    ip: clientIpFromHeaders(headerList),
    env: process.env,
  });
  if (!result.ok) return result;
  redirect(QMS_READY_PATH);
}
