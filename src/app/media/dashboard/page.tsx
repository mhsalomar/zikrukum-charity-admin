import { MediaWorkspace } from "@/components/media-workspace";
import { MyTasksSummary } from "@/components/my-tasks-summary";
import { requireAnyRole } from "@/lib/auth";
import { getMediaWorkspaceData } from "@/lib/media-workspace";
import { mediaRoles } from "@/lib/module-access";

export default async function MediaOfficerDashboardPage() {
  await requireAnyRole([...mediaRoles]);
  const data = await getMediaWorkspaceData();

  return (
    <div className="space-y-5">
      <MediaWorkspace
        data={data}
        basePath="/media"
        eyebrow="بوابة الإعلامي"
        title="مساحة العمل الإعلامية"
        description="الأخبار والتغطيات والمسودات القريبة من النشر."
      />
      <MyTasksSummary />
    </div>
  );
}
