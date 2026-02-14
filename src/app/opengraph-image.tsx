import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

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
          justifyContent: "center",
          background: "#09090b",
          color: "#f4f4f5",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900 }}>🔥 FIRECRAWL CTF</div>
        <div style={{ marginTop: 20, fontSize: 40, color: "#f97316" }}>
          10 problems. 45 seconds.
        </div>
      </div>
    ),
    size,
  );
}
