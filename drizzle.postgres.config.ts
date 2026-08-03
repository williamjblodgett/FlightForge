import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./packages/database/migrations",
  schema: "./packages/database/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://flightforge:local@localhost:5432/flightforge",
  },
  strict: true,
  verbose: true,
});
