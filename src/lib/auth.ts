import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { isMissingAuthSession } from "./supabase/auth-errors";

export async function getSignedInUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && !isMissingAuthSession(error)) throw new Error("Could not verify the current session.", { cause: error });
  return data.user;
}

export async function requireAdmin() {
  const user = await getSignedInUser();
  if (!user) redirect("/admin/login");

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Could not verify administrator access.", { cause: error });
  if (profile?.role !== "admin") redirect("/admin/login?error=not-admin");
  return user;
}

export async function getAdminActor() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && !isMissingAuthSession(userError)) throw new Error("Could not verify the current session.", { cause: userError });
  if (!userData.user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error("Could not verify administrator access.", { cause: error });
  return profile?.role === "admin" ? userData.user : null;
}
