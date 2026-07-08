import { MediaPostDetails } from "@/app/dashboard/media/posts/[id]/page";

export default function MediaOfficerPostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <MediaPostDetails params={params} basePath="/media/posts" />;
}
