import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { MobileNav } from "@/components/shell/MobileNav";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { brand } from "@/config/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function resolveRequestOrigin(requestHeaders: Headers): URL {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const directHost = requestHeaders.get("host")?.trim();
  const host = forwardedHost || directHost;
  const isSafeHost = Boolean(host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host));
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https";

  return new URL(isSafeHost ? `${protocol}://${host}` : `https://${brand.domain}`);
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const metadataBase = resolveRequestOrigin(requestHeaders);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: `${brand.productName} — Find your next round`,
      template: `%s · ${brand.productName}`,
    },
    description:
      "Discover disc golf courses, save favorites, and connect with verified course operators—starting in Maine and built to travel.",
    icons: {
      icon: brand.favicon,
      shortcut: brand.favicon,
    },
    openGraph: {
      type: "website",
      siteName: brand.productName,
      title: `${brand.productName} — Find your next round`,
      description: "Maine is the first tee. Find courses, plan a round, and build your game.",
      images: [{ url: socialImage, width: 1734, height: 907, alt: `${brand.productName} — Find your line. Forge your game.` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.productName} — Find your next round`,
      description: "Maine is the first tee. Find courses, plan a round, and build your game.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <div id="main-content" className="site-content">{children}</div>
        <SiteFooter />
        <MobileNav />
      </body>
    </html>
  );
}
