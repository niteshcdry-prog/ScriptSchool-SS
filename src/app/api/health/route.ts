import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { status: "degraded", checks: { database: false } },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("courses").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error("Health check database query failed.", error);
    return NextResponse.json(
      { status: "degraded", checks: { database: false } },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok", checks: { database: true } });
}
