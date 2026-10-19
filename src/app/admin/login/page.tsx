import Link from "next/link";
import AuthForm from "@/components/auth-form";
import { getSignedInUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSignedInUser();
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error("Could not verify administrator access.", { cause: error });
    if (profile?.role === "admin") redirect("/admin");
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">{"</>"}</span><span>script<span className="brand-accent">school</span></span></Link>
      <section className="auth-card">
        <span className="auth-eyebrow">SCRIPT SCHOOL ADMINISTRATION</span>
        <h1>Administrator sign in</h1>
        <p>Use your existing administrator account to open the protected dashboard. This page does not create or grant admin access.</p>
        {params.error === "not-admin" && <p className="auth-error" role="alert">This account does not have administrator access. Ask an existing administrator to grant the admin role.</p>}
        {!isSupabaseConfigured() && <p className="setup-banner">Accounts are not enabled yet. Configure Supabase to sign in to the administration dashboard.</p>}
        <AuthForm nextPath="/admin" enabled={isSupabaseConfigured()} adminOnly />
        <details className="admin-first-setup">
          <summary>Setting up the first administrator?</summary>
          <p>Create and verify an account at <Link href="/login">learner sign in</Link>, then run this in the Supabase SQL Editor with your registered email:</p>
          <pre><code>{"update public.profiles\nset role = 'admin'\nfrom auth.users\nwhere profiles.id = auth.users.id\n  and auth.users.email = 'your-email@example.com';"}</code></pre>
          <p>Replace the example email. Only a trusted project owner with Supabase SQL access should perform this step.</p>
        </details>
      </section>
      <p className="auth-footnote">Administrator access is managed securely through your Supabase account.</p>
    </main>
  );
}
