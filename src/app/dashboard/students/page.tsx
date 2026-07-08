import { RecordFormModal } from "@/components/record-form-modal";
import { CsvExportButton } from "@/components/csv-export-button";
import { DonutSummaryChart, HorizontalBarChart } from "@/components/report-charts";
import {
  StudentsList,
  type HalaqaEditOption,
  type StudentListRecord,
} from "@/components/students-list";
import { requireAnyRole } from "@/lib/auth";
import { operationalRoles, resourceConfigs } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

type RelatedObject = Record<string, unknown>;

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const config = resourceConfigs.students;
  const [result, halaqat, recentTeacherAdditions] = await Promise.all([
    getStudentRecords(),
    getHalaqaEditOptions(),
    getRecentTeacherAdditions(),
  ]);

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">وحدة الحلقات</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
                الطلاب
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                عرض الطلاب مع الحلقة والمعلم والفترة والمسجد، دون إضافة حضور أو
                حفظ في هذه المرحلة.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-[#6c8178]">الطلاب</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">
                  {result.records.length}
                </p>
              </div>
              <CsvExportButton
                filename="قائمة-الطلاب"
                data={result.records.map((r) => ({
                  "الاسم": r.fullName,
                  "الحلقة": r.halaqaName || "—",
                  "المعلم": r.teacherName || "—",
                  "المسجد": r.mosqueName || "—",
                  "المستوى": r.level || "—",
                  "الحالة": r.status,
                  "ولي الأمر": r.guardianName || "—",
                }))}
              />
              <Link
                href="/dashboard/students/import"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--gold)]/60 bg-[#fff8e6] px-4 text-sm font-semibold text-[#765514]"
              >
                استيراد المنجزات
              </Link>
              <RecordFormModal
                config={config}
                fields={config.fields}
                buttonLabel="إضافة طالب"
              />
            </div>
          </div>
        </div>
      </section>

      {resolveMessage(params) ? <StatusMessage message={resolveMessage(params)!} /> : null}

      {result.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          تعذر تحميل بيانات الطلاب مؤقتًا. حاول مرة أخرى أو تواصل مع مسؤول النظام.
        </div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <HorizontalBarChart
              title="عدد الطلاب حسب الحلقة"
              data={topStudentsByHalaqa(result.records)}
              source="المصدر: جدول الطلاب وروابط الحلقات"
            />
            <DonutSummaryChart
              title="حالة الطلاب"
              data={statusDistribution(result.records)}
              centerLabel="طالب"
            />
          </section>
          {recentTeacherAdditions.length ? (
            <section className="app-card rounded-2xl p-5">
              <h2 className="text-lg font-bold text-[var(--primary-dark)]">إضافات الطلاب الأخيرة</h2>
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">للمتابعة فقط؛ الطلاب أضيفوا مباشرة إلى حلقات معلميهم.</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {recentTeacherAdditions.map((item) => (
                  <article key={item.id} className="rounded-xl border border-[var(--line)] bg-[#fffdf8] p-3">
                    <p className="font-semibold text-[var(--primary-dark)]">{item.studentName}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.teacherName} · {item.halaqaName}</p>
                    {item.previewEntry ? (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        أُدخل بواسطة {item.enteredByName || "حساب تجربة"} ضمن تجربة بوابة المعلم
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-bold text-[#6c8178]">{formatDate(item.createdAt)}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <StudentsList records={result.records} halaqat={halaqat} />
        </>
      )}
    </div>
  );
}

async function getRecentTeacherAdditions() {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id,full_name,created_at,created_via_admin_preview,entered_by_name,creator:teachers!students_created_by_teacher_id_fkey(full_name),student_enrollments!student_enrollments_student_id_fkey(status,archived_at,halaqat!student_enrollments_halaqa_id_fkey(name))")
    .not("created_by_teacher_id", "is", null)
    .eq("is_test_account", false)
    .is("archived_at", null)
    .eq("is_test_account", false)
    .order("created_at", { ascending: false })
    .limit(12);
  return ((data ?? []) as unknown as RelatedObject[]).map((row) => {
    const enrollment = firstRelated(row.student_enrollments);
    return {
      id: readString(row.id),
      studentName: readString(row.full_name),
      teacherName: readString(readObject(row.creator).full_name),
      halaqaName: readString(readObject(enrollment.halaqat).name),
      createdAt: readString(row.created_at),
      previewEntry: Boolean(row.created_via_admin_preview),
      enteredByName: readString(row.entered_by_name),
    };
  });
}

function topStudentsByHalaqa(records: StudentListRecord[]) {
  const totals = new Map<string, number>();
  for (const record of records) {
    const label = record.halaqaName || "بدون حلقة";
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
}

function statusDistribution(records: StudentListRecord[]) {
  const labels: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    archived: "مؤرشف",
  };
  const totals = new Map<string, number>();
  for (const record of records) {
    const label = labels[record.status] ?? record.status ?? "غير محدد";
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals.entries()].map(([label, value]) => ({ label, value }));
}

async function getStudentRecords(): Promise<{
  records: StudentListRecord[];
  setupRequired: boolean;
}> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "id,full_name,national_id,birth_date,guardian_name,guardian_phone,level,enrolled_at,notes,status,student_enrollments!student_enrollments_student_id_fkey(id,halaqa_id,status,archived_at,halaqat!student_enrollments_halaqa_id_fkey(name,period,mosques!halaqat_mosque_id_fkey(name),primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)))",
    )
    .is("archived_at", null)
    .order("full_name");

  if (error) {
    return { records: [], setupRequired: true };
  }

  const records = ((data ?? []) as unknown as RelatedObject[]).map((student) => {
    const enrollment = firstRelated(student.student_enrollments);
    const halaqa = readObject(enrollment.halaqat);

    return {
      id: String(student.id),
      fullName: readString(student.full_name),
      nationalId: readString(student.national_id),
      birthDate: readString(student.birth_date),
      guardianName: readString(student.guardian_name),
      guardianPhone: readString(student.guardian_phone),
      level: readString(student.level),
      enrolledAt: readString(student.enrolled_at),
      notes: readString(student.notes),
      halaqaId: readString(enrollment.halaqa_id),
      halaqaName: readString(halaqa.name),
      teacherName: readString(readObject(halaqa.primary_teacher).full_name),
      period: readString(halaqa.period),
      mosqueName: readString(readObject(halaqa.mosques).name),
      status: readString(student.status) || "active",
    };
  });

  return { records, setupRequired: false };
}

function firstRelated(value: unknown) {
  if (Array.isArray(value) && value.length > 0) {
    const active = value.find((item) => {
      const enrollment = readObject(item);
      return (
        enrollment.status === "active" &&
        (enrollment.archived_at === null || enrollment.archived_at === undefined)
      );
    });

    return readObject(active ?? value[0]);
  }

  return {};
}

async function getHalaqaEditOptions(): Promise<HalaqaEditOption[]> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("halaqat")
    .select("id,name,period,mosques!halaqat_mosque_id_fkey(name),primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)")
    .eq("status", "active")
    .is("archived_at", null)
    .order("name");

  if (error) {
    return [];
  }

  return ((data ?? []) as unknown as RelatedObject[]).map((halaqa) => ({
    value: String(halaqa.id),
    label: readString(halaqa.name),
    teacherName: readString(readObject(halaqa.primary_teacher).full_name),
    period: readString(halaqa.period),
    mosqueName: readString(readObject(halaqa.mosques).name),
  }));
}

function readObject(value: unknown): RelatedObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RelatedObject)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
}

function resolveMessage(params: { created?: string; updated?: string; error?: string }) {
  if (params.created) return "created";
  if (params.updated) return "updated";
  if (params.error === "missing") return "missing";
  if (params.error) return "save";
  return undefined;
}

function StatusMessage({ message }: { message: "created" | "updated" | "missing" | "save" }) {
  const messages = {
    created: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "تم حفظ الطالب بنجاح.",
    },
    updated: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "تم تحديث بيانات الطالب بنجاح.",
    },
    missing: {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      text: "يرجى تعبئة الحقول المطلوبة.",
    },
    save: {
      className: "border-red-200 bg-red-50 text-red-700",
      text: "تعذر حفظ الطالب. تأكد من الصلاحيات.",
    },
  };
  const current = messages[message];

  return (
    <p className={`rounded-2xl border p-4 text-sm font-semibold ${current.className}`}>
      {current.text}
    </p>
  );
}
