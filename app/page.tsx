import { AuthLauncher } from "@/components/auth/AuthLauncher";
import Link from "next/link";

/**
 * Renders the public, server-rendered landing page.
 *
 * Interactive state is delegated to the small `AuthLauncher` client boundary, allowing the surrounding
 * page to remain a Server Component. The documentation link provides a non-authenticated entry into
 * the repository guide.
 *
 * @returns The demo wordmark, authentication launcher, and documentation link.
 */
export default function HomePage() {
  return (
    <main className="home">
      <div className="home-card">
        <h1>DEMO</h1>
        <p>Secure authentication demo</p>
        <AuthLauncher />
        <p className="home-docs-link">
          <Link href="/docs">Read the documentation</Link>
        </p>
      </div>
    </main>
  );
}
