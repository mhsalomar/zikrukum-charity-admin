import { StudentFileView } from "@/components/student-file-view";
import { getOperationalStudentFile } from "@/lib/student-file";

export default async function DashboardStudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOperationalStudentFile(id);

  return <StudentFileView data={data} backHref="/dashboard/students" />;
}
