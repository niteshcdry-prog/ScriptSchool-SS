"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <section className="error-card">
        <p className="auth-eyebrow">SCRIPT SCHOOL</p>
        <h1>We couldn’t load this page</h1>
        <p>Try again. If the issue continues, check the service configuration or contact the site administrator.</p>
        <button className="auth-submit" type="button" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
