import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { MemoImportView } from "@/components/MemoImportView";

export default async function CreateMemoPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/create");

  return <MemoImportView />;
}
