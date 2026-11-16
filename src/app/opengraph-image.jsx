import { ImageResponse } from "next/og";
export const alt =
  "Prathmesh Pawar — Software Engineer. C# / .NET / Backend development.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#080c12",
          display: "flex",
          flexDirection: "column",
          padding: "68px",
          color: "#eff3f2",
          fontFamily: "sans-serif",
          border: "1px solid #26313e",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#a1aebc",
          }}
        >
          <span>PRATHMESH PAWAR</span>
          <span>SOFTWARE ENGINEER / UK</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 70,
            fontSize: 78,
            letterSpacing: -4,
            lineHeight: 1.12,
          }}
        >
          <span>Engineering what</span>
          <span style={{ color: "#7df9e8" }}>comes next.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 26,
            borderTop: "1px solid #26313e",
            justifyContent: "space-between",
            fontSize: 22,
          }}
        >
          <span>C# · .NET · Backend · AI-enabled applications</span>
          <span style={{ color: "#7df9e8" }}>↗</span>
        </div>
      </div>
    ),
    size,
  );
}
