import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, getSupabaseServiceKey } from "./config";

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();
  return createClient(url, getSupabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
