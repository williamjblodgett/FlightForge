import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#06251a",
          color: "#d7ef72",
          display: "flex",
          fontFamily: "sans-serif",
          fontSize: 42,
          fontWeight: 900,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.12em",
          width: "100%",
        }}
      >
        F<span style={{ color: "#f4a63a", fontSize: 18 }}>●</span>
      </div>
    ),
    size,
  );
}
