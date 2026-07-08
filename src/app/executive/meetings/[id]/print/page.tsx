import { redirect } from "next/navigation";

export default async function ExecutiveMeetingPrintRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/minutes-print/${id}`);
}
