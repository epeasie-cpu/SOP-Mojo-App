import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function auditOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f4f6",
          color: "#18181b",
          padding: "72px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 800 }}>
          <div style={{ width: 10, height: 36, background: "#3dcc4a", borderRadius: 4 }} />
          SOP MOJO
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#157a32" }}>Ops Audit</div>
          <div style={{ marginTop: 12, fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1.05 }}>
            Ops Scalability Score
          </div>
          <div style={{ marginTop: 20, fontSize: 28, color: "#3f3f46", maxWidth: 900 }}>
            Free ops and exit readiness score for operations teams and leaders.
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#52525b" }}>audit.sopmojo.com</div>
      </div>
    ),
    { ...ogSize },
  );
}
