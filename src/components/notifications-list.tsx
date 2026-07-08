import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { markNotificationRead } from "@/app/dashboard/notifications/actions";
import type { NotificationItem } from "@/lib/notifications";

export function NotificationsList({
  notifications,
  emptyText,
  returnTo,
}: {
  notifications: NotificationItem[];
  emptyText: string;
  returnTo: string;
}) {
  if (notifications.length === 0) {
    return (
      <div className="app-card rounded-[1.5rem] p-8 text-center">
        <p className="text-lg font-bold text-[var(--primary-dark)]">{emptyText}</p>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">ستظهر الإشعارات الداخلية هنا عند إرسالها من الإدارة.</p>
      </div>
    );
  }

  return (
    <section className="grid gap-3">
      {notifications.map((notification) => (
        <article key={notification.recipientId} className="app-card rounded-[1.4rem] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--gold)]">{priorityLabel(notification.priority)} · {typeLabel(notification.type)}</p>
              <h2 className="mt-2 text-lg font-bold text-[var(--primary-dark)]">{notification.title}</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{notification.body}</p>
              {notification.linkUrl ? (
                <Link href={notification.linkUrl} className="mt-3 inline-flex rounded-xl border border-[var(--gold)]/50 bg-[#fff8e6] px-3 py-2 text-xs font-semibold text-[#765514]">
                  فتح الرابط المرتبط
                </Link>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${notification.readAt ? "bg-[#e8f5ee] text-[var(--primary-dark)]" : "bg-amber-100 text-amber-800"}`}>
                {notification.readAt ? "مقروء" : "غير مقروء"}
              </span>
              {!notification.readAt ? (
                <form action={markNotificationRead}>
                  <input type="hidden" name="recipient_id" value={notification.recipientId} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--primary-dark)]">
                    <CheckCircle2 aria-hidden className="size-4" />
                    تعليم كمقروء
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function typeLabel(value: string) {
  return {
    general: "عام",
    alert: "تنبيه",
    task: "مهمة",
    reminder: "تذكير",
    approval: "اعتماد",
  }[value] ?? value;
}

function priorityLabel(value: string) {
  return {
    normal: "عادي",
    important: "مهم",
    urgent: "عاجل",
  }[value] ?? value;
}
