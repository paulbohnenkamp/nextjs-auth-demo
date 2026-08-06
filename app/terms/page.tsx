import Link from "next/link";

/**
 * Renders the account-terms destination linked from profile completion.
 * The profile API records acceptance time when Next is submitted, but this placeholder is not a legal
 * agreement and must be replaced before adapting the repository to a real product.
 *
 * @returns Placeholder account terms and navigation back to the demo.
 */
export default function TermsPage() {
  return (
    <main className="dashboard">
      <article className="dashboard-card">
        <h1>Demo Account Terms</h1>
        <p>
          This placeholder exists for the authentication demonstration and is not a production legal
          agreement.
        </p>
        <Link href="/">Return home</Link>
      </article>
    </main>
  );
}
