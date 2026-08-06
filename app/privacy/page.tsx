import Link from "next/link";

/**
 * Renders the privacy destination linked from profile completion.
 * This is deliberately placeholder copy, not a deployable privacy policy; production owners must replace
 * it with reviewed language describing real collection, retention, access, and deletion practices.
 *
 * @returns A readable placeholder and navigation back to the demo.
 */
export default function PrivacyPage() {
  return (
    <main className="dashboard">
      <article className="dashboard-card">
        <h1>Demo Privacy Policy</h1>
        <p>
          This demo stores only the account and profile information described in its documentation.
        </p>
        <Link href="/">Return home</Link>
      </article>
    </main>
  );
}
