#!/usr/bin/env node
/**
 * Generates the shared secret that binds newsletter_request() to this server.
 *
 * The secret goes in the server environment. Only its SHA-256 hash goes in the
 * database, and the hash is not a credential — it cannot be reversed and
 * cannot be used to call the function.
 *
 * Nothing is written to disk and nothing is sent anywhere. Run it, copy the
 * two values to where they belong, then close the terminal.
 */
import { createHash, randomBytes } from "node:crypto";

const secret = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(secret).digest("hex");

console.log(`
  Newsletter RPC secret
  =====================

  1. SERVER ENVIRONMENT — .env.local, and Vercel (all three environments).
     Never prefix this with NEXT_PUBLIC_.

     NEWSLETTER_RPC_SECRET=${secret}

  2. DATABASE — run this once in the Supabase SQL Editor.
     This is the hash, not the secret. It is safe to paste.

     insert into public.app_config (key, value)
     values ('newsletter_rpc_secret_sha256', '${hash}')
     on conflict (key) do update
       set value = excluded.value, updated_at = now();

  The secret above is shown once and is not saved anywhere. If you lose it,
  run this again and redo both steps.
`);
