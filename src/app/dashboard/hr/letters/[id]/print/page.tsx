import { redirect } from "next/navigation";

export default async function HrLetterPrintRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hr-letters-print/${id}`);
}
