import { NextResponse } from "next/server";
import { DELIVERABLE_MAX_BYTES, deliverableUploadError, uploadDeliverable } from "@/lib/deliverables";
import { isResponse, requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

const STORAGE_PATH = /^(?!.*\.\.)[a-z0-9][a-z0-9./_-]{1,180}\.pdf$/i;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const storagePath = String(form?.get("path") ?? "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a PDF." }, { status: 400 });
  }
  if (!STORAGE_PATH.test(storagePath)) {
    return NextResponse.json({ error: "Path must be a PDF inside the deliverables bucket." }, { status: 400 });
  }
  const rejected = deliverableUploadError({ name: file.name, type: file.type, size: file.size });
  if (rejected) return NextResponse.json({ error: rejected }, { status: 400 });
  if (file.size > DELIVERABLE_MAX_BYTES) {
    return NextResponse.json({ error: "PDF must be 25MB or smaller." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    await uploadDeliverable({ storagePath, bytes, env: process.env });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not store the PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, path: storagePath });
}
