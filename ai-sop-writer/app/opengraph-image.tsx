import { ImageResponse } from "next/og";
import { hostLabel } from "@/lib/site";

export const alt = "AI SOP Writer — SOP Mojo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              background: "#B0FF56",
              color: "#10140c",
              fontSize: 28,
              fontWeight: 800,
              padding: "8px 14px",
            }}
          >
            SOP
          </div>
          <div
            style={{
              color: "#B0FF56",
              fontSize: 28,
              fontWeight: 800,
              padding: "8px 14px",
              border: "2px solid #B0FF56",
            }}
          >
            MOJO
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            AI SOP Writer
          </div>
          <div style={{ marginTop: 18, fontSize: 28, color: "#B0FF56", maxWidth: 900 }}>
            First-draft standard operating procedures — not statements of purpose.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#a1a1aa" }}>{hostLabel()}</div>
      </div>
    ),
    { ...size },
  );
}
