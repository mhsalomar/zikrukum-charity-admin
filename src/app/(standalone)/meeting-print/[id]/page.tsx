import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function MeetingPrintPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/minutes-print/${id}`);
}
