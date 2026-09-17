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
          background: "#10140c",
          color: "#f6f4ec",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", color: "#c6ff4a", fontSize: 28, fontWeight: 800 }}>
          SOP MOJO
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>AI SOP Writer</div>
          <div style={{ marginTop: 16, fontSize: 28, color: "#c6ff4a" }}>
            First-draft standard operating procedures
          </div>
        </div>
        <div style={{ fontSize: 22 }}>{hostLabel()}</div>
      </div>
    ),
    { ...size },
  );
}

