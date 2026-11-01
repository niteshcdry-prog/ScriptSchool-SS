"use client";

import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { isAuthSignUpEnabled } from "@/lib/auth-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "forgot";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const authCaptchaEnabled = process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true";
const authSignUpEnabled = process.env.NEXT_PUBLIC_AUTH_SIGNUP_ENABLED === "true";

export default function AuthForm({
  nextPath,
  enabled,
  adminOnly = false,
  initialMode = "signin",
}: {
  nextPath: string;
  enabled: boolean;
  adminOnly?: boolean;
  initialMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileInstance>(null);
  const captchaConfigured = !authCaptchaEnabled || Boolean(turnstileSiteKey);
  const signUpEnabled = isAuthSignUpEnabled({
    captchaEnabled: authCaptchaEnabled,
    signUpEnabled: authSignUpEnabled,
    siteKey: turnstileSiteKey,
  });

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setCaptchaToken(null);
    captchaRef.current?.reset();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!captchaConfigured) {
      setError("Authentication CAPTCHA is enabled, but its site key is not configured.");
      return;
    }
    if (mode === "signup" && !signUpEnabled) {
      setError("New account registration is currently paused.");
      return;
    }
    if (authCaptchaEnabled && !captchaToken) {
      setError("Complete the security check before continuing.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/auth/callback?next=/account/reset-password`;
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
          ...(captchaToken ? { captchaToken } : {}),
        });
        if (requestError) throw requestError;
        setMessage("If that email belongs to an account, a password reset link is on its way.");
      } else if (mode === "signup") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: name.trim() },
            ...(captchaToken ? { captchaToken } : {}),
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) window.location.assign(nextPath);
        else setMessage("Check your inbox to verify your email before signing in.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        if (signInError) throw signInError;
        if (adminOnly) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();
          if (profileError) throw profileError;
          if (profile?.role !== "admin") {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
            setError("This account does not have administrator access. Ask an existing administrator to grant the admin role.");
            return;
          }
        }
        window.location.assign(nextPath);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      captchaRef.current?.reset();
      setCaptchaToken(null);
      setBusy(false);
    }
  }

  const submitDisabled =
    !enabled ||
    busy ||
    !captchaConfigured ||
    (authCaptchaEnabled && !captchaToken) ||
    (mode === "signup" && !signUpEnabled);

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === "signup" && <label>Display name<input autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} /></label>}
      <label>Email address<input autoComplete="email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {mode !== "forgot" && <label>Password<input autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      {authCaptchaEnabled && turnstileSiteKey && (
        <div className="auth-captcha" role="group" aria-label="Security verification">
          <Turnstile
            ref={captchaRef}
            siteKey={turnstileSiteKey}
            onSuccess={(token) => { setCaptchaToken(token); setError(""); }}
            onExpire={() => { setCaptchaToken(null); setError("The security check expired. Please complete it again."); }}
            onError={() => { setCaptchaToken(null); setError("The security check could not load. Check your connection and try again."); }}
          />
        </div>
      )}
      {authCaptchaEnabled && !turnstileSiteKey && (
        <p className="auth-error" role="alert">Authentication CAPTCHA is enabled, but its public site key is not configured.</p>
      )}
      {mode === "signup" && !signUpEnabled && (
        <p className="auth-captcha-help" role="status">New account registration is currently paused.</p>
      )}
      {authCaptchaEnabled && !captchaToken && captchaConfigured && (
        <p className="auth-captcha-help" role="status">Complete the security check to continue.</p>
      )}
      {mode === "signin" && <button className="auth-text-button" type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-success" role="status">{message}</p>}
      <button className="auth-submit" type="submit" disabled={submitDisabled}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
      {adminOnly ? (
        mode === "forgot"
          ? <button className="auth-mode-button" type="button" onClick={() => changeMode("signin")}>Back to admin sign in</button>
          : <p className="auth-switch">Need a learner account? <Link href="/login">Learner sign in</Link></p>
      ) : mode === "forgot" ? (
        <button className="auth-mode-button" type="button" onClick={() => changeMode("signin")}>Back to sign in</button>
      ) : mode === "signup" ? (
        <p className="auth-switch">Already have an account?{" "}
          <button className="auth-mode-button" type="button" onClick={() => changeMode("signin")}>Sign in</button>
        </p>
      ) : signUpEnabled ? (
        <p className="auth-switch">{mode === "signin" ? "New to Script School?" : "Already have an account?"}{" "}
          <button className="auth-mode-button" type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create an account" : "Sign in"}</button>
        </p>
      ) : null}
    </form>
  );
}
