import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentUser } from "@/lib/session";

/**
 * Resolves authentication on the server before rendering protected dashboard content.
 *
 * `getCurrentUser` hashes the request cookie and checks its database session. Anonymous, unknown, and
 * expired sessions redirect before account data reaches the response. Only the logout control becomes
 * a Client Component; identity remains server-derived.
 *
 * @returns The personalized dashboard for a valid session; otherwise triggers a redirect to `/`.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return (
    <main className="dashboard">
      <section className="dashboard-card">
        <p className="wordmark">DEMO</p>
        <h1>Welcome, {user.firstName}</h1>
        <p>You are securely signed in as {user.email}.</p>
        <LogoutButton />
        <p className="dashboard-docs-link">
          <Link href="/docs">Developer documentation</Link>
        </p>
      </section>
    </main>
  );
}
