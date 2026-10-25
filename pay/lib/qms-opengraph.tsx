import { ImageResponse } from "next/og";

export const alt = "Do you need a QMS?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function qmsOpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0C0E0C",
          color: "#f4f4f5",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#C1FF72" }}>SOP MOJO</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 650, lineHeight: 1.05, maxWidth: 980 }}>
            Do you need a QMS?
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#d4d4d8" }}>
            2-minute Quality System Fit Check. Free.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
