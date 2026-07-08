import { StudentFileView } from "@/components/student-file-view";
import { getTeacherStudentFile } from "@/lib/student-file";

export default async function TeacherStudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getTeacherStudentFile(id);

  return <StudentFileView data={data} backHref="/teacher/dashboard#teacher-students" teacherMode />;
}
