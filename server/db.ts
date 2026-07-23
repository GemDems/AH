import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Prevent unhandled 'error' events from crashing the process when Neon
// terminates an idle connection (FATAL: terminating connection due to
// administrator command). The pool will create a fresh connection on the
// next query automatically.
pool.on('error', (err) => {
  console.error('DB pool error (handled):', err.message);
});

export const db = drizzle({ client: pool, schema });