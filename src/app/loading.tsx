export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Loading Script School">
      <div className="loading-mark" aria-hidden="true">{"</>"}</div>
      <p>Loading your learning space…</p>
    </main>
  );
}
