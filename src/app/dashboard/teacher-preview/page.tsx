import { Search, UserRoundSearch } from "lucide-react";

import { PageHero } from "@/components/dashboard-ui";
import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { startTeacherPreviewAction } from "./actions";

type Row = Record<string, unknown>;

export default async function TeacherPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  await requireAnyRole(["admin", "demo_admin"]);
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const teachers = await getTeachers(query);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="اختبار آمن للصلاحيات"
        title="تجربة بوابة معلم أو معلمة"
        description="اختر معلمًا لعرض نطاقه كما هو، دون نقل الطلاب أو تغيير ربط الحلقات. أي إضافة أو اختبار سيُسجل باسم حساب التجربة أو الإدارة المنفذ للعملية."
      />

      {params.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          تعذر بدء المعاينة. اختر معلمًا صالحًا وحاول مرة أخرى.
        </p>
      ) : null}

      <form className="app-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row" action="/dashboard/teacher-preview">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-3.5 size-5 text-[var(--muted)]" />
          <input
            name="q"
            defaultValue={query}
            placeholder="ابحث باسم المعلم أو المعلمة"
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white pr-12 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--gold)]/50"
          />
        </label>
        <button className="primary-button min-h-12 rounded-xl px-6 text-sm font-semibold">بحث</button>
      </form>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teachers.map((teacher) => (
          <article key={teacher.id} className="app-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserRoundSearch className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-[var(--primary-dark)]">{teacher.fullName}</h2>
                <p className="mt-1 break-words text-xs font-bold text-[var(--muted)]">{teacher.email || "لا يوجد بريد"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <Stat label="الحلقات" value={teacher.halaqat} />
              <Stat label="الطلاب" value={teacher.students} />
            </div>
            <form action={startTeacherPreviewAction} className="mt-4">
              <input type="hidden" name="teacher_id" value={teacher.id} />
              <button className="min-h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100">
                فتح بوابة المعلم كتجربة
              </button>
            </form>
          </article>
        ))}
      </section>

      {teachers.length === 0 ? (
        <p className="app-card rounded-2xl p-8 text-center text-sm font-bold text-[var(--muted)]">
          لا يوجد معلمون مطابقون للبحث.
        </p>
      ) : null}
    </div>
  );
}

async function getTeachers(query: string) {
  const supabase = await createClient();
  let teacherQuery = supabase
    .from("teachers")
    .select("id,full_name,email,halaqat!halaqat_teacher_id_fkey(id,student_enrollments!student_enrollments_halaqa_id_fkey(student_id,status,archived_at))")
    .is("archived_at", null)
    .neq("email", "qa@example.com")
    .order("full_name")
    .limit(100);
  if (query) teacherQuery = teacherQuery.ilike("full_name", `%${query}%`);
  const { data } = await teacherQuery;

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const halaqat = Array.isArray(row.halaqat) ? (row.halaqat as Row[]) : [];
    const studentIds = new Set(
      halaqat.flatMap((halaqa) =>
        (Array.isArray(halaqa.student_enrollments) ? (halaqa.student_enrollments as Row[]) : [])
          .filter((item) => item.status === "active" && !item.archived_at)
          .map((item) => String(item.student_id)),
      ),
    );
    return {
      id: String(row.id),
      fullName: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      halaqat: halaqat.length,
      students: studentIds.size,
    };
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--bg-sunken)] p-3">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

