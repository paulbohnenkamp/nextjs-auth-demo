import fs from "node:fs/promises";
import path from "node:path";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const docsRoot = path.join(process.cwd(), "docs");
const primaryDocs = [
  ["Overview", "/docs"],
  ["Development", "/docs/development-workflows"],
  ["Auth flow", "/docs/auth-flow"],
  ["File guide", "/docs/file-guide"],
  ["Security", "/docs/security"],
  ["API reference", "/docs/reference"],
] as const;

/** Resolves an extensionless portal path to a Markdown source file without allowing traversal. */
async function resolveDocument(slug: string[]) {
  if (slug.some((part) => !/^[A-Za-z0-9._-]+$/.test(part))) return null;
  const relative = slug.length ? slug.join("/") : "index";
  const candidates = [`${relative}.md`, `${relative}/README.md`];
  for (const candidate of candidates) {
    const absolute = path.resolve(docsRoot, candidate);
    if (!absolute.startsWith(`${docsRoot}${path.sep}`)) continue;
    try {
      return { source: await fs.readFile(absolute, "utf8"), relative: candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

/** Converts relative Markdown links into extensionless links handled by this documentation portal. */
function portalHref(href: string | undefined, currentFile: string) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href)) return href;
  const [file, anchor] = href.split("#", 2);
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(currentFile), file));
  resolved = resolved.replace(/\.md$/i, "").replace(/\/README$/i, "");
  return `/docs/${resolved}${anchor ? `#${anchor}` : ""}`.replace(/\/docs\/index$/, "/docs");
}

/**
 * Renders authored repository guides and generated TypeDoc Markdown inside the application.
 *
 * The `slug` is resolved beneath the fixed `docs` root. Each segment is allow-listed and the final
 * absolute path is checked, preventing traversal outside documentation. Relative Markdown links are
 * translated into portal routes, GitHub-flavored tables are enabled, and missing pages use Next.js's
 * standard not-found boundary. Because page routes opt into dynamic rendering, `npm run docs` output
 * appears after refresh without restarting the development server.
 *
 * @param props - Object containing extensionless path segments relative to `docs`; use an empty array
 * for `index.md`.
 * @returns Server-rendered documentation navigation and Markdown content.
 */
export async function DocumentationPage({ slug }: { slug: string[] }) {
  const document = await resolveDocument(slug);
  if (!document) notFound();

  return (
    <main className="docs-shell">
      <aside className="docs-sidebar">
        <Link className="docs-brand" href="/">
          DEMO AUTH
        </Link>
        <nav aria-label="Documentation">
          {primaryDocs.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <article className="docs-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              const destination = portalHref(href, document.relative);
              return destination?.startsWith("/docs") ? (
                <Link href={destination as Route}>{children}</Link>
              ) : (
                <a href={destination}>{children}</a>
              );
            },
          }}
        >
          {document.source}
        </ReactMarkdown>
      </article>
    </main>
  );
}
