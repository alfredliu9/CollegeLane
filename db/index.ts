import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Run the app through `npm run dev` (or `npm start`) so the Cloudflare Vite plugin provides the local D1 binding declared in vite.config.ts."
    );
  }

  return drizzle(env.DB, { schema });
}
