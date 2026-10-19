import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function consumeRequestRateLimit(
  scope: "quiz-check",
  clientKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_scope: scope,
    p_client_key: clientKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("The request rate limit could not be checked.", { cause: error });
  if (typeof data !== "boolean") throw new Error("The request rate limit returned an invalid response.");
  return data;
}
