import { DocumentsScreen } from "@/components/screens/DocumentsScreen";

// Next 16에서 params는 Promise다. 반드시 await 한다 (§2.1).
export default async function Page(props: PageProps<"/grants/[id]/documents">) {
  const { id } = await props.params;
  return <DocumentsScreen programId={id} />;
}
