import { DocumentationPage } from "@/components/docs/DocumentationPage";

/** Always reads Markdown from disk so regenerated TypeDoc appears after a browser refresh. */
export const dynamic = "force-dynamic";

/** Browser documentation landing page. */
export default function DocsIndexPage() {
  return <DocumentationPage slug={[]} />;
}
