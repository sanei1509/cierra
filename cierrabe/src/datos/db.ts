import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL para conectar a PostgreSQL");
}

const globalForDb = globalThis as unknown as { cierraPgPool?: Pool };

const pool =
  globalForDb.cierraPgPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") globalForDb.cierraPgPool = pool;

export const db = drizzle({ client: pool, schema });
export type Db = typeof db;

export async function cerrarDb() {
  await pool.end();
  if (process.env.NODE_ENV !== "production") delete globalForDb.cierraPgPool;
}
