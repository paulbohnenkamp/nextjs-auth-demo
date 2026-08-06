import { DocumentationPage } from "@/components/docs/DocumentationPage";

/** Always reads Markdown from disk so regenerated TypeDoc appears after a browser refresh. */
export const dynamic = "force-dynamic";

/** Browser documentation page for a hand-written or generated Markdown path. */
export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DocumentationPage slug={slug} />;
}
