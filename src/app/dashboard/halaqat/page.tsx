import { HalaqatList, type HalaqaListRecord } from "@/components/halaqat-list";
import { CsvExportButton } from "@/components/csv-export-button";
import { RecordFormModal } from "@/components/record-form-modal";
import { requireAnyRole } from "@/lib/auth";
import {
  getResourceOptions,
  operationalRoles,
  resourceConfigs,
} from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

type RelatedObject = Record<string, unknown>;

export default async function HalaqatPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const config = resourceConfigs.halaqat;
  const [result, options] = await Promise.all([
    getHalaqatRecords(),
    getResourceOptions(),
  ]);
  const fields = config.fields.map((field) => {
    if (field.name === "mosque_id") return { ...field, options: options.mosques };
    if (field.name === "teacher_id") return { ...field, options: options.teachers };
    if (field.name === "supervisor_id") {
      return { ...field, options: options.supervisors };
    }
    return field;
  });

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">وحدة الحلقات</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
                الحلقات
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                عرض الحلقات مع المعلم والفترة والمسجد والداعم وعدد الطلاب.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-[#6c8178]">الحلقات</p>
                <p className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">
                  {result.records.length}
                </p>
              </div>
              <CsvExportButton
                filename="قائمة-الحلقات"
                data={result.records.map((r) => ({
                  "الحلقة": r.name,
                  "المعلم": r.teacherName || "—",
                  "المسجد": r.mosqueName || "—",
                  "الفترة": r.period || "—",
                  "الراعي": r.sponsorName || "—",
                  "الطلاب": r.studentCount ?? 0,
                  "الحالة": r.status || "—",
                }))}
              />
              <RecordFormModal
                config={config}
                fields={fields}
                buttonLabel="إضافة حلقة"
              />
            </div>
          </div>
        </div>
      </section>

      {resolveMessage(params) ? <StatusMessage message={resolveMessage(params)!} /> : null}

      {result.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          تعذر تحميل بيانات الحلقات. تحقق من صلاحياتك أو تواصل مع مدير النظام.
        </div>
      ) : (
        <HalaqatList config={config} fields={fields} records={result.records} />
      )}
    </div>
  );
}

async function getHalaqatRecords(): Promise<{
  records: HalaqaListRecord[];
  setupRequired: boolean;
}> {
  await requireAnyRole([...operationalRoles]);
  const supabase = await createClient();
  const [halaqat, enrollments] = await Promise.all([
    supabase
      .from("halaqat")
      .select("id,name,mosque_id,teacher_id,supervisor_id,period,sponsor_name,status,mosques!halaqat_mosque_id_fkey(name),primary_teacher:teachers!halaqat_teacher_id_fkey(full_name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_enrollments")
      .select("halaqa_id,status")
      .eq("status", "active"),
  ]);

  if (halaqat.error || enrollments.error) {
    return { records: [], setupRequired: true };
  }

  const studentCounts = new Map<string, number>();
  for (const enrollment of (enrollments.data ?? []) as unknown as RelatedObject[]) {
    const halaqaId = readString(enrollment.halaqa_id);
    if (halaqaId) {
      studentCounts.set(halaqaId, (studentCounts.get(halaqaId) ?? 0) + 1);
    }
  }

  const records = ((halaqat.data ?? []) as unknown as RelatedObject[]).map((halaqa) => {
    const id = String(halaqa.id);

    return {
      id,
      name: readString(halaqa.name),
      mosque_id: readString(halaqa.mosque_id),
      teacher_id: readString(halaqa.teacher_id),
      supervisor_id: readString(halaqa.supervisor_id),
      sponsor_name: readString(halaqa.sponsor_name),
      teacherName: readString(readObject(halaqa.primary_teacher).full_name),
      period: readString(halaqa.period),
      mosqueName: readString(readObject(halaqa.mosques).name),
      sponsorName: readString(halaqa.sponsor_name),
      studentCount: studentCounts.get(id) ?? 0,
      status: readString(halaqa.status) || "active",
    };
  });

  return { records, setupRequired: false };
}

function readObject(value: unknown): RelatedObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RelatedObject)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
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
      text: "تم حفظ الحلقة بنجاح.",
    },
    updated: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "تم تحديث الحلقة بنجاح.",
    },
    missing: {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      text: "يرجى تعبئة الحقول المطلوبة.",
    },
    save: {
      className: "border-red-200 bg-red-50 text-red-700",
      text: "تعذر حفظ الحلقة. تأكد من الصلاحيات.",
    },
  };
  const current = messages[message];

  return (
    <p className={`rounded-2xl border p-4 text-sm font-semibold ${current.className}`}>
      {current.text}
    </p>
  );
}
