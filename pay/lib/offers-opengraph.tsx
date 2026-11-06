import { ImageResponse } from "next/og";

export const alt = "How to create high-converting offers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function offersOpenGraphImage(): ImageResponse {
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
            How to create high-converting offers
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#a1a1aa" }}>
            The 2026 guide. $19.99.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
