import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
  });
}
