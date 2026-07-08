import { MediaWorkspace } from "@/components/media-workspace";
import { requireAnyRole } from "@/lib/auth";
import { getMediaWorkspaceData } from "@/lib/media-workspace";
import { executiveRoles } from "@/lib/module-access";

export default async function MediaPage() {
  await requireAnyRole([...executiveRoles]);
  const data = await getMediaWorkspaceData();

  return (
    <MediaWorkspace
      data={data}
      basePath="/dashboard/media"
      eyebrow="المركز الإعلامي"
      title="مساحة العمل الإعلامية"
      description="مراجعة تشغيلية للأخبار والتغطيات والتعاميم قبل الاعتماد والنشر الداخلي."
      showCategories
    />
  );
}
