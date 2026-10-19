import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Account services are not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error && !isMissingAuthSession(error)) {
    console.error("Signing out failed.", error);
    return NextResponse.json({ error: "Sign out failed." }, { status: 500 });
  }
  return NextResponse.json({ signedOut: true });
}
