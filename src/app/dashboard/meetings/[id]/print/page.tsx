import { redirect } from "next/navigation";

export default async function MeetingPrintRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/minutes-print/${id}`);
}
