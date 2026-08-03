import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: brand.colors.primary[950],
          color: brand.colors.secondary[300],
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
        {brand.shortProductName.slice(0, 1)}<span style={{ color: brand.colors.accent, fontSize: 18 }}>●</span>
      </div>
    ),
    size,
  );
}
