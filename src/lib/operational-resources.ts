import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const operationalRoles = ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager", "supervisor"] as const;

type ResourceName =
  | "centers"
  | "mosques"
  | "teachers"
  | "supervisors"
  | "halaqat"
  | "students";

type FieldKind = "text" | "email" | "tel" | "date" | "select";

export type FieldConfig = {
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export type ResourceConfig = {
  name: ResourceName;
  title: string;
  description: string;
  table: ResourceName;
  listSelect: string;
  orderBy: string;
  columns: Array<{ key: string; label: string }>;
  fields: FieldConfig[];
};

export type ResourceRecord = Record<string, unknown> & {
  id: string;
  status?: string | null;
};

type ResourceResult = {
  records: ResourceRecord[];
  setupRequired: boolean;
};

const statusOptions = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
];

export const resourceConfigs = {
  centers: {
    name: "centers",
    title: "المراكز",
    description: "إدارة بيانات المراكز الأساسية عند الحاجة دون إظهارها كتنقل رئيسي.",
    table: "centers",
    listSelect: "id,name,city,address,status,created_at",
    orderBy: "created_at",
    columns: [
      { key: "name", label: "اسم المركز" },
      { key: "city", label: "المدينة" },
      { key: "address", label: "العنوان" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم المركز", required: true },
      { name: "city", label: "المدينة" },
      { name: "address", label: "العنوان" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
  mosques: {
    name: "mosques",
    title: "المساجد",
    description: "إدارة المساجد المرتبطة بالحلقات والمراكز عند الحاجة.",
    table: "mosques",
    listSelect: "id,name,center_id,district,address,status,centers!mosques_center_id_fkey(name),created_at",
    orderBy: "created_at",
    columns: [
      { key: "name", label: "اسم المسجد" },
      { key: "center_name", label: "المركز" },
      { key: "district", label: "الحي" },
      { key: "address", label: "العنوان" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم المسجد", required: true },
      { name: "center_id", label: "المركز", kind: "select" },
      { name: "district", label: "الحي" },
      { name: "address", label: "العنوان" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
  teachers: {
    name: "teachers",
    title: "المعلمون",
    description: "إدارة بيانات المعلمين الأساسية دون صلاحيات تشغيلية إضافية الآن.",
    table: "teachers",
    listSelect: "id,full_name,phone,email,status,created_at",
    orderBy: "created_at",
    columns: [
      { key: "full_name", label: "اسم المعلم" },
      { key: "phone", label: "الجوال" },
      { key: "email", label: "البريد" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "full_name", label: "اسم المعلم", required: true },
      { name: "phone", label: "رقم الجوال", kind: "tel" },
      { name: "email", label: "البريد الإلكتروني", kind: "email" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
  supervisors: {
    name: "supervisors",
    title: "المشرفون",
    description: "إدارة بيانات المشرفين الأساسية دون صلاحيات تشغيلية إضافية الآن.",
    table: "supervisors",
    listSelect: "id,full_name,phone,email,status,created_at",
    orderBy: "created_at",
    columns: [
      { key: "full_name", label: "اسم المشرف" },
      { key: "phone", label: "الجوال" },
      { key: "email", label: "البريد" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "full_name", label: "اسم المشرف", required: true },
      { name: "phone", label: "رقم الجوال", kind: "tel" },
      { name: "email", label: "البريد الإلكتروني", kind: "email" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
  halaqat: {
    name: "halaqat",
    title: "الحلقات",
    description: "إدارة الحلقات وربطها بالمسجد والمعلم والمشرف اختياريًا.",
    table: "halaqat",
    listSelect:
      "id,name,period,sponsor_name,status,mosques!halaqat_mosque_id_fkey(name),primary_teacher:teachers!halaqat_teacher_id_fkey(full_name),supervisors!halaqat_supervisor_id_fkey(full_name),created_at",
    orderBy: "created_at",
    columns: [
      { key: "name", label: "اسم الحلقة" },
      { key: "mosque_name", label: "المسجد" },
      { key: "teacher_name", label: "المعلم" },
      { key: "period", label: "الفترة" },
      { key: "sponsor_name", label: "الداعم / الكفيل" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم الحلقة", required: true },
      { name: "mosque_id", label: "المسجد", kind: "select", required: true },
      { name: "teacher_id", label: "المعلم", kind: "select", required: true },
      { name: "supervisor_id", label: "المشرف", kind: "select" },
      {
        name: "period",
        label: "الفترة",
        kind: "select",
        required: true,
        options: [
          { value: "fajr", label: "الفجر" },
          { value: "asr", label: "العصر" },
          { value: "maghrib", label: "المغرب" },
          { value: "isha", label: "العشاء" },
        ],
      },
      { name: "sponsor_name", label: "الداعم / الكفيل" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
  students: {
    name: "students",
    title: "الطلاب",
    description: "إدارة بيانات الطلاب الأساسية فقط، دون حضور أو حفظ أو مراجعة الآن.",
    table: "students",
    listSelect: "id,full_name,guardian_phone,status,created_at",
    orderBy: "created_at",
    columns: [
      { key: "full_name", label: "اسم الطالب" },
      { key: "guardian_phone", label: "جوال ولي الأمر" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "full_name", label: "اسم الطالب", required: true },
      { name: "national_id", label: "رقم الهوية", placeholder: "اختياري" },
      { name: "birth_date", label: "تاريخ الميلاد", kind: "date" },
      { name: "guardian_name", label: "اسم ولي الأمر" },
      { name: "guardian_phone", label: "جوال ولي الأمر", kind: "tel" },
      { name: "level", label: "المستوى" },
      { name: "enrolled_at", label: "تاريخ الالتحاق", kind: "date" },
      { name: "notes", label: "ملاحظات" },
      { name: "status", label: "الحالة", kind: "select", options: statusOptions },
    ],
  },
} satisfies Record<ResourceName, ResourceConfig>;

export async function getResourceRecords(config: ResourceConfig): Promise<ResourceResult> {
  await requireAnyRole([...operationalRoles]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(config.table)
    .select(config.listSelect)
    .is("archived_at", null)
    .order(config.orderBy, { ascending: false });

  if (error) {
    return { records: [], setupRequired: true };
  }

  return {
    records: ((data ?? []) as unknown as ResourceRecord[]).map(
      flattenResourceRecord,
    ),
    setupRequired: false,
  };
}

export async function getResourceOptions() {
  await requireAnyRole([...operationalRoles]);

  const supabase = await createClient();
  const [centers, mosques, teachers, supervisors, halaqat] = await Promise.all([
    readOptions(supabase, "centers", "name"),
    readOptions(supabase, "mosques", "name"),
    readOptions(supabase, "teachers", "full_name"),
    readOptions(supabase, "supervisors", "full_name"),
    readOptions(supabase, "halaqat", "name"),
  ]);

  return { centers, mosques, teachers, supervisors, halaqat };
}

async function readOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  labelColumn: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select(`id,${labelColumn}`)
    .eq("status", "active")
    .is("archived_at", null)
    .order(labelColumn);

  if (error) {
    return [];
  }

  return ((data ?? []) as unknown as Array<Record<string, string>>).map(
    (item) => ({
      value: item.id,
      label: item[labelColumn],
    }),
  );
}

function flattenResourceRecord(record: ResourceRecord) {
  const flattened = { ...record };
  flattened.mosque_name = readRelatedName(record.mosques, "name");
  flattened.center_name = readRelatedName(record.centers, "name");
  flattened.teacher_name = readRelatedName(record.primary_teacher, "full_name");
  flattened.supervisor_name = readRelatedName(record.supervisors, "full_name");
  return flattened;
}

function readRelatedName(value: unknown, key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return "";
  }

  const related = value as Record<string, unknown>;
  return typeof related[key] === "string" ? related[key] : "";
}
