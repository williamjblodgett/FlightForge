import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function getPostgresDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the PostgreSQL adapter.");
  }

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: databaseUrl.includes("supabase") ? "require" : false,
  });
  return drizzle(client, { schema });
}

export type PostgresDatabase = ReturnType<typeof getPostgresDatabase>;
