import { NotificationsList } from "@/components/notifications-list";
import { requireAnyRole } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function SupervisorNotificationsPage() {
  const { user } = await requireAnyRole(["admin", "demo_admin", "supervisor"]);
  const { notifications } = await getUserNotifications(user.id, false, 50);

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">الإشراف</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">إشعارات المشرف</h1>
        </div>
      </section>
      <NotificationsList notifications={notifications} emptyText="لا توجد إشعارات إشرافية حاليًا" returnTo="/supervisor/notifications" />
    </div>
  );
}
