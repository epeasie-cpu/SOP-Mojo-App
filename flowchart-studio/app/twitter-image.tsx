import { ImageResponse } from "next/og";
import { hostLabel } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
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
        <div style={{ display: "flex", color: "#B0FF56", fontSize: 28, fontWeight: 800 }}>
          SOP MOJO
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 700 }}>Flowchart Studio</div>
          <div style={{ marginTop: 16, fontSize: 28, color: "#B0FF56" }}>
            Handwriting to flowchart · AI process map
          </div>
        </div>
        <div style={{ fontSize: 22 }}>{hostLabel()}</div>
      </div>
    ),
    { ...size },
  );
}
