export const brand = {
  productName: "FlightForge",
  shortProductName: "Forge",
  appStoreName: "FlightForge Disc Golf",
  legalEntityName: "FlightForge",
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
      50: "#f5f8f6",
      100: "#e4eee7",
      500: "#245b46",
      700: "#194a37",
      900: "#163c30",
      950: "#0c2b20",
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
