import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: brand.colors.primary[950], color: brand.colors.secondary[500], display: "flex", fontFamily: "sans-serif", fontSize: 43, fontWeight: 950, height: "100%", justifyContent: "center", width: "100%" }}>F</div>,
    size,
  );
}
