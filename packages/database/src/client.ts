import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getPostgresDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the PostgreSQL adapter.");
  }

  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

export type PostgresDatabase = ReturnType<typeof getPostgresDatabase>;
