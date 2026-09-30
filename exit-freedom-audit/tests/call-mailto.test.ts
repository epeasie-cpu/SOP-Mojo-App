import { describe, expect, it } from "vitest";
import { CALL_ASK, CALL_TO, buildCallMailto } from "@/lib/call-mailto";
import { shareSummaryFromReport } from "@/lib/score";
import { fillScore } from "./helpers";

describe("request a call mailto", () => {
  it("addresses only ryan@sopmojo.com and includes the score, band, and gaps", () => {
    const summary = shareSummaryFromReport(fillScore("exit", "A"));
    const href = buildCallMailto(summary);
    const url = new URL(href);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(CALL_TO);
    expect(href).not.toMatch(/mailto:[^?]*@(?!sopmojo\.com)/);
    expect(url.searchParams.get("subject")).toBe(`Request a call — Ops Scalability Score ${summary.score}/100`);
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain(CALL_ASK);
    expect(body).toContain(`Score: ${summary.score}/100`);
    expect(body).toContain(`Band: ${summary.bandLabel}`);
    expect(body).toContain("Top gaps");
    for (const gap of summary.gaps) {
      expect(body).toContain(gap);
    }
    expect(body).toContain("document our workflows");
    expect(href).not.toContain("resend");
  });

  it("keeps a line break out of a gap title", () => {
    const href = buildCallMailto({
      score: 40,
      bandLabel: "Building — not yet scalable",
      gaps: ["Coverage\n<script>"],
    });
    const body = new URL(href).searchParams.get("body") ?? "";
    expect(body).toContain("• Coverage <script>");
    expect(body).not.toContain("Coverage\n<script>");
  });
});
