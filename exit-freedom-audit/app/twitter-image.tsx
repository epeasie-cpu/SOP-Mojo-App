import { auditOgImage, ogContentType, ogSize } from "@/lib/og";

export const alt = "Exit / Freedom Readiness — Ops Scalability Score by SOP Mojo";
export const size = ogSize;
export const contentType = ogContentType;

export default function TwitterImage() {
  return auditOgImage();
}
