import Link from "next/link";
import AuthForm from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string; required?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const signUpEnabled =
    process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">{"</>"}</span><span>script<span className="brand-accent">school</span></span></Link>
      <section className="auth-card">
        <span className="auth-eyebrow">YOUR LEARNING SPACE</span>
        <h1>Welcome to Script School</h1>
        <p>{signUpEnabled
          ? "Sign in to your existing account or create a free account to access course content and save your progress."
          : "Sign in to your existing account to access course content and save your progress."}</p>
        {params.required === "1" && <p className="auth-access-notice" role="status">Sign in or create an account to access the course content.</p>}
        {params.error && <p className="auth-error" role="alert">The sign-in link could not be verified. Request a fresh link and try again.</p>}
        {!isSupabaseConfigured() && <p className="setup-banner">Accounts are not enabled yet. Set up your Supabase environment to sign in or register.</p>}
        {isSupabaseConfigured() && !signUpEnabled && <p className="auth-access-notice" role="status">New account registration is paused until Turnstile CAPTCHA is configured and enabled.</p>}
        <AuthForm nextPath={nextPath} enabled={isSupabaseConfigured()} initialMode={params.mode === "signup" ? "signup" : "signin"} />
        <p className="auth-switch admin-login-prompt">Administrator? <Link href="/admin/login">Go to administrator sign in</Link></p>
      </section>
      <p className="auth-footnote">Your curiosity is the best place to begin.</p>
    </main>
  );
}
