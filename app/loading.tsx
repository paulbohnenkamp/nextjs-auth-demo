/**
 * Provides an announced global loading state while an App Router segment suspends.
 * The `status` role makes progress discoverable without duplicating page-specific loading logic.
 *
 * @returns A full-page loading surface consistent with the public visual treatment.
 */
export default function Loading() {
  return (
    <main className="home">
      <div className="home-card" role="status">
        Loading…
      </div>
    </main>
  );
}
