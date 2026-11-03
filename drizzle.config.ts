import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: 'postgresql',
  schemaFilter: ['public', 'musicnerd_private', 'mn_private'],
  dbCredentials: {
    url: process.env.SUPABASE_DB_CONNECTION!,
  }
});