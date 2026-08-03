export const brand = {
  productName: "FlightForge",
  shortProductName: "Forge",
  appStoreName: "FlightForge Disc Golf",
  legalEntityName: "FlightForge, Inc. (working title)",
  supportEmail: "support@flightforge.example",
  domain: "flightforge.example",
  logo: {
    wordmark: "FlightForge",
    accessibleLabel: "FlightForge home",
  },
  favicon: "/icon",
  colors: {
    primary: {
      50: "#eefbf3",
      100: "#d7f5e1",
      500: "#24a565",
      700: "#147a49",
      900: "#0b3927",
      950: "#06251a",
    },
    secondary: {
      300: "#d7ef72",
      500: "#a8cf3c",
      700: "#688f19",
    },
    accent: "#f4a63a",
  },
  socialHandles: {
    instagram: "@flightforgeapp",
    facebook: "flightforgeapp",
  },
} as const;

export type BrandConfig = typeof brand;
