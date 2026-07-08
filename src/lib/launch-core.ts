import { requireAnyRole } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type LaunchTable =
  | "certificates"
  | "donors"
  | "donations"
  | "pledges"
  | "donation_receipts"
  | "volunteers"
  | "volunteer_opportunities"
  | "volunteer_hours"
  | "ministry_reports"
  | "exams"
  | "exam_results"
  | "external_notification_templates"
  | "external_notification_logs";

export type LaunchField = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "email" | "tel" | "textarea" | "select";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

export type LaunchConfig = {
  key: string;
  table: LaunchTable;
  title: string;
  eyebrow: string;
  description: string;
  path: string;
  printPath?: string;
  fields: LaunchField[];
  columns: Array<{ key: string; label: string }>;
  allowedRoles: AppRole[];
};

export type LaunchRow = Record<string, unknown> & { id: string };

const adminRoles: AppRole[] = ["admin", "demo_admin", "executive_director", "executive_manager"];
const adminOnly: AppRole[] = ["admin", "demo_admin"];

const statusOptions = [
  { value: "draft", label: "مسودة" },
  { value: "ready", label: "جاهز" },
  { value: "approved", label: "معتمد" },
  { value: "archived", label: "مؤرشف" },
];

const certificateTypes = [
  { value: "memorization", label: "شهادة حفظ" },
  { value: "completion", label: "شهادة اجتياز" },
  { value: "participation", label: "شهادة مشاركة" },
  { value: "excellence", label: "شهادة تميز" },
  { value: "competition", label: "شهادة مسابقة" },
  { value: "thanks", label: "شهادة شكر" },
];
const donorTypes = [
  { value: "individual", label: "فرد" },
  { value: "foundation", label: "مؤسسة" },
  { value: "company", label: "شركة" },
  { value: "grantor", label: "جهة مانحة" },
  { value: "general", label: "متبرع عام" },
];
const donorCategories = [
  { value: "major", label: "مانح رئيسي" },
  { value: "recurring", label: "مانح متكرر" },
  { value: "new", label: "مانح جديد" },
  { value: "program_supporter", label: "داعم برامج" },
  { value: "uncategorized", label: "غير مصنف" },
];
export const donorRelationshipStages = [
  { value: "new_donor", label: "مانح جديد" },
  { value: "first_contact", label: "تواصل أول" },
  { value: "interested", label: "مهتم" },
  { value: "pledged", label: "تعهد" },
  { value: "donated", label: "تم التبرع" },
  { value: "receipt_issued", label: "تم إصدار الإيصال" },
  { value: "thanked", label: "تم الشكر" },
  { value: "follow_up", label: "متابعة لاحقة" },
  { value: "inactive", label: "غير نشط" },
];
const supportTypes = [
  { value: "cash", label: "نقدي" },
  { value: "in_kind", label: "عيني" },
  { value: "program_sponsorship", label: "رعاية برنامج" },
  { value: "halaqat_sponsorship", label: "كفالة حلقات" },
  { value: "competition", label: "مسابقة" },
  { value: "general", label: "عام" },
];
const receiptStatus = [
  { value: "not_issued", label: "غير مصدر" },
  { value: "issued", label: "صادر" },
  { value: "sent", label: "مرسل" },
];
const pledgeStatus = [
  { value: "open", label: "مفتوح" },
  { value: "partially_collected", label: "محصل جزئيًا" },
  { value: "collected", label: "محصل" },
  { value: "overdue", label: "متأخر" },
  { value: "cancelled", label: "ملغي" },
];
const activeStatus = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "archived", label: "مؤرشف" },
];
const volunteerStatus = [
  { value: "candidate", label: "مرشح" },
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "archived", label: "مؤرشف" },
];
const opportunityStatus = [
  { value: "open", label: "مفتوحة" },
  { value: "completed", label: "مكتملة" },
  { value: "archived", label: "مؤرشفة" },
];
const approvalStatus = [
  { value: "pending", label: "قيد الاعتماد" },
  { value: "approved", label: "معتمدة" },
  { value: "rejected", label: "مرفوضة" },
];
const examTypes = [
  { value: "memorization", label: "حفظ" },
  { value: "review", label: "مراجعة" },
  { value: "tajweed", label: "تجويد" },
  { value: "competition", label: "مسابقة" },
];

export const launchConfigs = {
  certificates: {
    key: "certificates",
    table: "certificates",
    title: "الشهادات",
    eyebrow: "إصدار واعتماد",
    description: "إصدار شهادات الحفظ والاجتياز والمشاركة والتميز بقالب رسمي قابل للطباعة.",
    path: "/dashboard/certificates",
    printPath: "/dashboard/certificates",
    allowedRoles: adminRoles,
    columns: [
      { key: "certificate_number", label: "رقم الشهادة" },
      { key: "recipient_name", label: "المستفيد" },
      { key: "certificate_type", label: "النوع" },
      { key: "issued_at", label: "تاريخ الإصدار" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "certificate_number", label: "رقم الشهادة" },
      { name: "recipient_name", label: "اسم الطالب / المستفيد", required: true },
      { name: "certificate_type", label: "نوع الشهادة", type: "select", options: certificateTypes },
      { name: "title", label: "عنوان الشهادة", required: true },
      { name: "body", label: "نص الشهادة", type: "textarea", required: true },
      { name: "issued_at", label: "تاريخ الإصدار", type: "date" },
      { name: "approved_by", label: "المعتمد" },
      { name: "status", label: "الحالة", type: "select", options: statusOptions },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  donors: {
    key: "donors",
    table: "donors",
    title: "المانحون",
    eyebrow: "علاقات المانحين",
    description: "سجل مركزي للمانحين والداعمين مع تصنيف يساعد على المتابعة والتقارير.",
    path: "/dashboard/donors",
    allowedRoles: adminRoles,
    columns: [
      { key: "name", label: "المانح" },
      { key: "donor_type", label: "النوع" },
      { key: "category", label: "التصنيف" },
      { key: "relationship_stage", label: "مرحلة العلاقة" },
      { key: "next_action_date", label: "الإجراء القادم" },
      { key: "phone", label: "الجوال" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم المانح", required: true },
      { name: "donor_type", label: "نوع المانح", type: "select", options: donorTypes },
      { name: "phone", label: "الجوال", type: "tel" },
      { name: "email", label: "البريد", type: "email" },
      { name: "city", label: "المدينة" },
      { name: "category", label: "التصنيف", type: "select", options: donorCategories },
      { name: "relationship_stage", label: "مرحلة العلاقة", type: "select", options: donorRelationshipStages },
      { name: "next_action", label: "الإجراء القادم" },
      { name: "next_action_date", label: "تاريخ الإجراء القادم", type: "date" },
      { name: "last_contact_at", label: "آخر تواصل", type: "date" },
      { name: "contact_owner", label: "مسؤول التواصل" },
      { name: "status", label: "الحالة", type: "select", options: activeStatus },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  donations: {
    key: "donations",
    table: "donations",
    title: "التبرعات",
    eyebrow: "إدارة الدعم",
    description: "تسجيل التبرعات النقدية والعينية ورعاية البرامج مع حالة الإيصال.",
    path: "/dashboard/donations",
    allowedRoles: adminRoles,
    columns: [
      { key: "donation_date", label: "التاريخ" },
      { key: "amount", label: "المبلغ" },
      { key: "support_type", label: "نوع الدعم" },
      { key: "reference_number", label: "المرجع" },
      { key: "receipt_status", label: "الإيصال" },
    ],
    fields: [
      { name: "donor_id", label: "معرف المانح" },
      { name: "donation_date", label: "التاريخ", type: "date" },
      { name: "amount", label: "المبلغ", type: "number", required: true },
      { name: "support_type", label: "نوع الدعم", type: "select", options: supportTypes },
      { name: "reference_number", label: "رقم العملية / المرجع" },
      { name: "receipt_status", label: "حالة الإيصال", type: "select", options: receiptStatus },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  pledges: {
    key: "pledges",
    table: "pledges",
    title: "التعهدات",
    eyebrow: "متابعة التحصيل",
    description: "متابعة التعهدات المفتوحة والمتأخرة والمحصل منها.",
    path: "/dashboard/pledges",
    allowedRoles: adminRoles,
    columns: [
      { key: "pledged_amount", label: "مبلغ التعهد" },
      { key: "pledge_date", label: "تاريخ التعهد" },
      { key: "due_date", label: "الاستحقاق" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "donor_id", label: "معرف المانح" },
      { name: "pledged_amount", label: "مبلغ التعهد", type: "number", required: true },
      { name: "pledge_date", label: "تاريخ التعهد", type: "date" },
      { name: "due_date", label: "تاريخ الاستحقاق", type: "date" },
      { name: "status", label: "الحالة", type: "select", options: pledgeStatus },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  donation_receipts: {
    key: "donation_receipts",
    table: "donation_receipts",
    title: "الإيصالات",
    eyebrow: "توثيق وشكر",
    description: "إصدار إيصالات شكر رسمية للتبرعات، مع رقم إيصال وحالة اعتماد.",
    path: "/dashboard/receipts",
    allowedRoles: adminRoles,
    columns: [
      { key: "receipt_number", label: "رقم الإيصال" },
      { key: "receipt_date", label: "التاريخ" },
      { key: "amount", label: "المبلغ" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "receipt_number", label: "رقم الإيصال" },
      { name: "donor_id", label: "معرف المانح" },
      { name: "donation_id", label: "معرف التبرع" },
      { name: "receipt_date", label: "التاريخ", type: "date" },
      { name: "amount", label: "المبلغ", type: "number", required: true },
      { name: "thank_you_text", label: "نص الشكر", type: "textarea" },
      { name: "status", label: "الحالة", type: "select", options: statusOptions },
    ],
  },
  volunteers: {
    key: "volunteers",
    table: "volunteers",
    title: "المتطوعون",
    eyebrow: "إدارة المتطوعين",
    description: "إدارة المتطوعين ومهاراتهم وحالتهم دون إظهار الهوية كاملة في الجداول.",
    path: "/dashboard/volunteers",
    allowedRoles: adminRoles,
    columns: [
      { key: "full_name", label: "الاسم" },
      { key: "phone", label: "الجوال" },
      { key: "specialization", label: "التخصص" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "full_name", label: "اسم المتطوع", required: true },
      { name: "phone", label: "الجوال", type: "tel" },
      { name: "email", label: "البريد", type: "email" },
      { name: "national_id", label: "الهوية - اختياري" },
      { name: "skills", label: "المهارات", type: "textarea" },
      { name: "specialization", label: "التخصص" },
      { name: "status", label: "الحالة", type: "select", options: volunteerStatus },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  volunteer_opportunities: {
    key: "volunteer_opportunities",
    table: "volunteer_opportunities",
    title: "الفرص التطوعية",
    eyebrow: "تخطيط الفرص",
    description: "تعريف الفرص التطوعية وساعاتها المتوقعة والمسؤول عنها.",
    path: "/dashboard/volunteer-opportunities",
    allowedRoles: adminRoles,
    columns: [
      { key: "name", label: "الفرصة" },
      { key: "department", label: "القسم" },
      { key: "opportunity_date", label: "التاريخ" },
      { key: "expected_hours", label: "الساعات" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم الفرصة", required: true },
      { name: "department", label: "القسم" },
      { name: "opportunity_date", label: "التاريخ", type: "date" },
      { name: "expected_hours", label: "الساعات المتوقعة", type: "number" },
      { name: "responsible_name", label: "المسؤول" },
      { name: "status", label: "الحالة", type: "select", options: opportunityStatus },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  volunteer_hours: {
    key: "volunteer_hours",
    table: "volunteer_hours",
    title: "ساعات التطوع",
    eyebrow: "اعتماد الساعات",
    description: "توثيق ساعات التطوع وربطها بالفرص عند توفرها.",
    path: "/dashboard/volunteer-hours",
    allowedRoles: adminRoles,
    columns: [
      { key: "work_date", label: "التاريخ" },
      { key: "hours_count", label: "الساعات" },
      { key: "work_description", label: "العمل" },
      { key: "approval_status", label: "الاعتماد" },
    ],
    fields: [
      { name: "volunteer_id", label: "معرف المتطوع" },
      { name: "opportunity_id", label: "معرف الفرصة" },
      { name: "work_date", label: "التاريخ", type: "date" },
      { name: "hours_count", label: "عدد الساعات", type: "number", required: true },
      { name: "work_description", label: "وصف العمل", type: "textarea" },
      { name: "approval_status", label: "حالة الاعتماد", type: "select", options: approvalStatus },
    ],
  },
  ministry_reports: {
    key: "ministry_reports",
    table: "ministry_reports",
    title: "تقارير الوزارة",
    eyebrow: "وزارة الشؤون الإسلامية",
    description: "تقرير تشغيلي قابل للمواءمة مع النماذج الرسمية عند توفرها.",
    path: "/dashboard/ministry-reports",
    printPath: "/dashboard/ministry-reports/print",
    allowedRoles: adminRoles,
    columns: [
      { key: "title", label: "العنوان" },
      { key: "report_period", label: "الفترة" },
      { key: "report_date", label: "التاريخ" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "title", label: "عنوان التقرير", required: true },
      { name: "report_period", label: "الفترة" },
      { name: "report_date", label: "تاريخ التقرير", type: "date" },
      { name: "attendance_summary", label: "ملخص الحضور", type: "textarea" },
      { name: "memorization_summary", label: "ملخص الحفظ والمراجعة", type: "textarea" },
      { name: "programs_summary", label: "البرامج والمسابقات", type: "textarea" },
      { name: "status", label: "الحالة", type: "select", options: statusOptions },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  exams: {
    key: "exams",
    table: "exams",
    title: "الاختبارات والتسميع",
    eyebrow: "تقييم رسمي",
    description: "إدارة اختبارات الحفظ والمراجعة والتجويد والمسابقات وربط النتائج لاحقًا بالشهادات.",
    path: "/dashboard/exams",
    allowedRoles: adminRoles,
    columns: [
      { key: "title", label: "الاختبار" },
      { key: "exam_type", label: "النوع" },
      { key: "exam_date", label: "التاريخ" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "title", label: "عنوان الاختبار", required: true },
      { name: "exam_type", label: "نوع الاختبار", type: "select", options: examTypes },
      { name: "exam_date", label: "تاريخ الاختبار", type: "date" },
      { name: "surah_scope", label: "السورة / النطاق" },
      { name: "committee_name", label: "اللجنة / المقيم" },
      { name: "status", label: "الحالة", type: "select", options: statusOptions },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  external_notification_templates: {
    key: "external_notification_templates",
    table: "external_notification_templates",
    title: "قوالب الرسائل الخارجية",
    eyebrow: "جاهزية مستقبلية",
    description: "هذه القوالب للتجهيز فقط. الربط الخارجي غير مفعل ولا توجد مفاتيح أو تكاليف.",
    path: "/dashboard/settings",
    allowedRoles: adminOnly,
    columns: [
      { key: "name", label: "القالب" },
      { key: "channel", label: "القناة" },
      { key: "status", label: "الحالة" },
    ],
    fields: [
      { name: "name", label: "اسم القالب", required: true },
      { name: "message_body", label: "نص الرسالة", type: "textarea", required: true },
      { name: "status", label: "الحالة", type: "select", options: [{ value: "inactive", label: "غير مفعل حاليًا" }] },
      { name: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
} satisfies Record<string, LaunchConfig>;

export const labelMaps: Record<string, string> = Object.fromEntries(
  [
    ...certificateTypes,
    ...donorTypes,
    ...donorCategories,
    ...donorRelationshipStages,
    ...supportTypes,
    ...receiptStatus,
    ...pledgeStatus,
    ...volunteerStatus,
    ...opportunityStatus,
    ...approvalStatus,
    ...examTypes,
    ...statusOptions,
    ...activeStatus,
    { value: "not_issued", label: "غير مصدر" },
    { value: "sent", label: "مرسل" },
    { value: "memorization", label: "حفظ" },
    { value: "review", label: "مراجعة" },
    { value: "recitation", label: "تسميع" },
    { value: "tajweed", label: "تجويد" },
    { value: "present", label: "حاضر" },
    { value: "absent", label: "غائب" },
    { value: "late", label: "متأخر" },
    { value: "excused", label: "بعذر" },
    { value: "excellent", label: "ممتاز" },
    { value: "very_good", label: "جيد جدًا" },
    { value: "good", label: "جيد" },
    { value: "needs_follow_up", label: "يحتاج متابعة" },
    { value: "weak", label: "ضعيف" },
    { value: "fajr", label: "الفجر" },
    { value: "asr", label: "العصر" },
    { value: "maghrib", label: "المغرب" },
    { value: "isha", label: "العشاء" },
  ].map((item) => [item.value, item.label]),
);

export async function getLaunchRows(config: LaunchConfig, limit = 100, filters?: Record<string, string | undefined>) {
  await requireAnyRole(config.allowedRoles);
  const supabase = await createClient();
  let query = supabase
    .from(config.table)
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (config.key === "donors") {
    if (filters?.stage) query = query.eq("relationship_stage", filters.stage);
    if (filters?.next === "upcoming") {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query = query.not("next_action", "is", null).gte("next_action_date", today.toISOString().slice(0, 10)).lte("next_action_date", nextWeek.toISOString().slice(0, 10));
    }
    if (filters?.next === "missing_contact") {
      query = query.is("last_contact_at", null);
    }
  }

  const { data, error } = await query;

  return { rows: (data ?? []) as LaunchRow[], error: error?.message ?? null };
}

export async function getLaunchCounts() {
  const supabase = await createClient();
  const tables: LaunchTable[] = ["certificates", "donations", "pledges", "volunteers", "exams"];
  const results = await Promise.all(
    tables.map((table) => supabase.from(table).select("id", { count: "exact", head: true }).is("archived_at", null)),
  );
  return Object.fromEntries(tables.map((table, index) => [table, results[index].count ?? 0]));
}

export function formatLaunchValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (typeof value === "number") return new Intl.NumberFormat("ar-SA").format(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return new Intl.DateTimeFormat("ar-SA").format(new Date(text));
  return labelMaps[text] ?? text;
}
