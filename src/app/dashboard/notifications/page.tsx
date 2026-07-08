import Link from "next/link";
import { Bell, Plus } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { getAdminNotifications } from "@/lib/notifications";

export default async function NotificationsAdminPage() {
  await requireAnyRole([...executiveRoles, "supervisor"]);
  const { rows, error } = await getAdminNotifications();

  return (
    <div className="space-y-5">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative flex flex-col gap-4 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold-soft)]">الإشعارات الداخلية</p>
            <h1 className="mt-2 text-3xl font-bold">إدارة الإشعارات</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#d9eee5]">
              إرسال تنبيهات داخلية للمعلمين أو المشرفين أو مستخدم محدد، بدون رسائل جوال أو واتساب أو بريد خارجي.
            </p>
          </div>
          <Link href="/dashboard/notifications/new" className="gold-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white">
            <Plus aria-hidden className="size-4" />
            إرسال إشعار
          </Link>
        </div>
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {error ? (
          <Empty title="تعذر تحميل الإشعارات" text="تحقق من صلاحياتك أو تواصل مع مدير النظام." />
        ) : rows.length === 0 ? (
          <Empty title="لا توجد إشعارات مرسلة" text="ابدأ بإرسال إشعار داخلي عند الحاجة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="formal-table w-full min-w-[820px] text-right text-sm">
              <thead>
                <tr>
                  {["العنوان", "النوع", "الأولوية", "الوجهة", "الرابط", "تاريخ الإرسال"].map((heading) => (
                    <th key={heading} className="px-5 py-4">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{String(row.title ?? "")}</td>
                    <td className="px-5 py-4">{typeLabel(String(row.type ?? ""))}</td>
                    <td className="px-5 py-4">{priorityLabel(String(row.priority ?? ""))}</td>
                    <td className="px-5 py-4">{targetLabel(row)}</td>
                    <td className="px-5 py-4">{String(row.link_url ?? "لا يوجد")}</td>
                    <td className="px-5 py-4">{formatDate(String(row.created_at ?? ""))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-8 text-center">
      <Bell aria-hidden className="mx-auto size-8 text-[var(--gold)]" />
      <p className="mt-3 text-lg font-bold text-[var(--primary-dark)]">{title}</p>
      <p className="mt-2 text-sm font-bold text-[var(--muted)]">{text}</p>
    </div>
  );
}

function targetLabel(row: Record<string, unknown>) {
  const targetType = String(row.target_type ?? "");
  if (targetType === "all_teachers") return "كل المعلمين";
  if (targetType === "all_supervisors") return "كل المشرفين";
  if (targetType === "role") return `دور: ${roleLabel(String(row.target_role ?? ""))}`;
  if (targetType === "user") return "مستخدم محدد";
  if (targetType === "circle") return "حلقة محددة";
  return "غير محدد";
}

function roleLabel(value: string) {
  return { teacher: "معلم", supervisor: "مشرف", executive_director: "مدير تنفيذي", media_officer: "إعلامي", admin: "مدير النظام" }[value] ?? value;
}

function typeLabel(value: string) {
  return { general: "عام", alert: "تنبيه", task: "مهمة", reminder: "تذكير", approval: "اعتماد" }[value] ?? value;
}

function priorityLabel(value: string) {
  return { normal: "عادي", important: "مهم", urgent: "عاجل" }[value] ?? value;
}

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "غير محدد";
}
