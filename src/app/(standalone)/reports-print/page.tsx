import { OfficialPrintPage } from "@/components/official-print-layout";
import { requireAnyRole } from "@/lib/auth";
import { money } from "@/lib/finance";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardReportsPrintPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAnyRole([...executiveRoles]);
  const params = await searchParams;
  const summary = await getPrintableSummary();

  return (
    <OfficialPrintPage title="تقرير إداري مختصر" documentDate={new Date().toISOString()} variant="report">
      <section className="py-7">
        <div className="grid grid-cols-3 gap-3 text-sm font-bold">
          <Info label="من تاريخ" value={params.from || "كل الفترة"} />
          <Info label="إلى تاريخ" value={params.to || "كل الفترة"} />
          <Info label="نوع التقرير" value={params.type || "تقرير شامل"} />
        </div>
        <h2 className="mt-8 text-lg font-bold text-[#075f4d]">الملخص</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <Info label="المعلمون" value={String(summary.teachers)} />
          <Info label="الحلقات" value={String(summary.halaqat)} />
          <Info label="الطلاب" value={String(summary.students)} />
          <Info label="زيارات المشرفين" value={String(summary.visits)} />
          <Info label="الخطابات" value={String(summary.letters)} />
          <Info label="الاجتماعات" value={String(summary.meetings)} />
          <Info label="الإيرادات" value={money(summary.revenues)} />
          <Info label="المصروفات" value={money(summary.expenses)} />
          <Info label="صافي المتابعة" value={money(summary.revenues - summary.expenses)} />
        </div>
        <h2 className="mt-8 text-lg font-bold text-[#075f4d]">بنود المتابعة</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f4f0e6]">
              <th className="border border-[#d1d5db] p-3 text-right">القسم</th>
              <th className="border border-[#d1d5db] p-3 text-right">المؤشر</th>
              <th className="border border-[#d1d5db] p-3 text-right">ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            <Row section="الإشراف" indicator={`${summary.visits} زيارة`} note="تُراجع التفاصيل من تقارير الإشراف." />
            <Row section="المعلمون" indicator={`${summary.incompleteTeachers} ناقصي بيانات`} note="استكمال الهوية والآيبان والبنك قبل المسيرات." />
            <Row section="الصادر" indicator={`${summary.pendingLetters} قيد الاعتماد`} note="تُطبع الخطابات من صفحة الصادر الرسمية." />
            <Row section="الاجتماعات" indicator={`${summary.pendingMeetings} مسودة`} note="اعتماد المحاضر والقرارات من قسم الاجتماعات." />
          </tbody>
        </table>
      </section>
    </OfficialPrintPage>
  );
}

async function getPrintableSummary() {
  const supabase = await createClient();
  const [teachers, halaqat, students, visits, letters, meetings, pendingLetters, pendingMeetings, teacherRows, revenues, expenses] = await Promise.all([
    count("teachers"),
    count("halaqat"),
    count("students"),
    count("supervisor_visits"),
    count("hr_letters"),
    count("meetings"),
    supabase.from("hr_letters").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"]).is("archived_at", null),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("status", "draft").is("archived_at", null),
    supabase.from("teachers").select("id,document_number,iban,bank_name,payroll_data_status").is("archived_at", null).limit(500),
    supabase.from("finance_revenues").select("amount").is("archived_at", null).limit(500),
    supabase.from("finance_expenses").select("amount").is("archived_at", null).limit(500),
  ]);
  return {
    teachers,
    halaqat,
    students,
    visits,
    letters,
    meetings,
    pendingLetters: pendingLetters.count ?? 0,
    pendingMeetings: pendingMeetings.count ?? 0,
    incompleteTeachers: (teacherRows.data ?? []).filter((teacher) => !teacher.document_number || !teacher.iban || !teacher.bank_name || teacher.payroll_data_status !== "complete").length,
    revenues: (revenues.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    expenses: (expenses.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  };

  async function count(table: string) {
    const { count: total } = await supabase.from(table).select("id", { count: "exact", head: true }).is("archived_at", null);
    return total ?? 0;
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d1d5db] p-3">
      <p className="text-xs text-[#667c74]">{label}</p>
      <p className="mt-1 font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function Row({ section, indicator, note }: { section: string; indicator: string; note: string }) {
  return (
    <tr>
      <td className="border border-[#d1d5db] p-3 font-bold">{section}</td>
      <td className="border border-[#d1d5db] p-3">{indicator}</td>
      <td className="border border-[#d1d5db] p-3">{note}</td>
    </tr>
  );
}
