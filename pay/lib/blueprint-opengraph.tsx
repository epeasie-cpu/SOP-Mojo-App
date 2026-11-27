import { ImageResponse } from "next/og";

export const alt = "The Business OS Blueprint";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function blueprintOpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          color: "#f4f4f5",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#b0ff56" }}>SOP MOJO</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 650, lineHeight: 1.05, maxWidth: 980 }}>
            The Business OS Blueprint
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#a1a1aa" }}>
            SOPs and systems from $1M to $10M. $27.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
