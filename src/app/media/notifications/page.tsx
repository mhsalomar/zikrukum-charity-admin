import { NotificationsList } from "@/components/notifications-list";
import { requireAuth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export default async function MediaNotificationsPage() {
  const user = await requireAuth();
  const { notifications } = await getUserNotifications(user.id, false, 50);

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">بوابة الإعلامي</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">إشعاراتي</h1>
        </div>
      </section>
      <NotificationsList notifications={notifications} emptyText="لا توجد إشعارات للإعلامي حاليًا" returnTo="/media/notifications" />
    </div>
  );
}
