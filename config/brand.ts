export const brand = {
  productName: "FlightForge",
  shortProductName: "Forge",
  appStoreName: "FlightForge Disc Golf",
  legalEntityName: "FlightForge, Inc. (working title)",
  supportEmail: "",
  domain: "flightforge-maine-launch.williamjblodgett.chatgpt.site",
  logo: {
    wordmark: "FlightForge",
    accessibleLabel: "FlightForge home",
    mark: "/brand/flightforge-mark.png",
  },
  favicon: "/brand/flightforge-mark.png",
  colors: {
    primary: {
      50: "#f2f4f6",
      100: "#dce2e8",
      500: "#254665",
      700: "#12304e",
      900: "#071f39",
      950: "#041529",
    },
    secondary: {
      300: "#ffa14a",
      500: "#ff7417",
      700: "#b84306",
    },
    accent: "#ff7417",
  },
  socialHandles: {
    instagram: "@flightforgeapp",
    facebook: "flightforgeapp",
  },
} as const;

export type BrandConfig = typeof brand;
