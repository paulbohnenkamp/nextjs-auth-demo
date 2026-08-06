import type { Metadata } from "next";
import "./globals.css";

/** Default browser title and description for the demo. */
export const metadata: Metadata = {
  title: "Next.js Auth Demo",
  description: "A secure Next.js, Prisma, and PostgreSQL authentication flow demo.",
};

/**
 * Defines the shared HTML document for public, authenticated, API-adjacent, and documentation pages.
 * Global styling is imported once at module scope, while individual pages supply semantic landmarks.
 *
 * @param props - Layout object containing the active App Router segment selected for the request.
 * @returns The root English-language HTML and body elements.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
