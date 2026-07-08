import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function MinistryReportsPrintPage() {
  await requireAnyRole([...executiveRoles]);
  const supabase = await createClient();
  const [mosques, halaqat, teachers, students, progress, programs] = await Promise.all([
    count("mosques"),
    count("halaqat"),
    count("teachers"),
    count("students"),
    count("student_progress_records"),
    count("programs"),
  ]);

  async function count(table: string) {
    const { count: total } = await supabase.from(table).select("id", { count: "exact", head: true });
    return total ?? 0;
  }

  return (
    <OfficialPrintPage title="تقرير مبدئي لوزارة الشؤون الإسلامية" variant="report">
      <div className="space-y-6 text-sm font-bold leading-8 text-[#111827]">
        <p>هذا التقرير يعرض البيانات الفعلية المتوفرة في منصة جمعية ذكركم، ويظل قابلًا للمواءمة مع النموذج الرسمي عند توفره.</p>
        <table className="w-full border-collapse text-right">
          <tbody>
            {[
              ["المساجد", mosques],
              ["الحلقات", halaqat],
              ["المعلمون", teachers],
              ["الطلاب", students],
              ["سجلات الحفظ والمراجعة", progress],
              ["البرامج والمسابقات", programs],
            ].map(([label, value]) => (
              <tr key={String(label)}>
                <td className="border border-[#d8c8a9] p-3 font-semibold text-[#0b3d33]">{label}</td>
                <td className="border border-[#d8c8a9] p-3">{new Intl.NumberFormat("ar-SA").format(Number(value))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OfficialPrintPage>
  );
}
