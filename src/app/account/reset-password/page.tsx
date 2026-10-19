"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now return to learning.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your password could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">{"</>"}</span><span>script<span className="brand-accent">school</span></span></Link>
      <section className="auth-card">
        <span className="auth-eyebrow">ACCOUNT SECURITY</span>
        <h1>Choose a new password</h1>
        <p>Use at least 8 characters. This reset link is available only after you request it by email.</p>
        {!isSupabaseConfigured() ? <p className="setup-banner">Password reset requires Supabase configuration.</p> : (
          <form className="auth-form" onSubmit={submit}>
            <label>New password<input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-success" role="status">{message}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
