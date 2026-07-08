import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing server admin key");
  }

  return createClient(getSupabaseUrl(), key, {
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
