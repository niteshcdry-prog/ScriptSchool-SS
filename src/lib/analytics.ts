import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { learnerAnalyticsSchema } from "@/lib/analytics-schema";

export async function getLearnerAnalytics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_learner_analytics");
  if (error) throw new Error("Could not load your learning analytics.", { cause: error });
  return learnerAnalyticsSchema.parse(data);
}
