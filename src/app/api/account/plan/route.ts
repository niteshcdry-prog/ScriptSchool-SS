import { NextResponse } from "next/server";
import { getSignedInUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanById, type PlanId } from "@/lib/plans";

export async function GET() {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your plan." }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Fetching account plan failed.", error);
    return NextResponse.json({ error: "Your plan could not be loaded." }, { status: 500 });
  }

  const plan: PlanId = getPlanById(profile?.plan || "free");
  return NextResponse.json({
    plan,
    isAdmin: profile?.role === "admin",
    premiumAccess: plan === "pro",
    billingReady: false,
    message: "Subscription checkout is not connected yet. Verified billing or administrator access remains the only source of Pro access.",
  });
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: "Plan changes require an active billing subscription or an administrator action.",
      status: "billing_required",
    },
    { status: 403 },
  );
}
