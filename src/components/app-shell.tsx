import Image from "next/image";
import Link from "next/link";
import { Calendar, LogOut } from "lucide-react";

import { signOut } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HeaderPopovers } from "@/components/header-popovers";
import { MobileMenu } from "@/components/mobile-menu";
import { QuranQuoteCard } from "@/components/quran-quote-card";
import { getUserNotifications } from "@/lib/notifications";
import type { AppRole } from "@/lib/roles";

export async function AppShell({
  children,
  roles,
  userId,
}: {
  children: React.ReactNode;
  roles: AppRole[];
  userId: string;
}) {
  const { notifications } = await getUserNotifications(userId, false, 8);
  const notificationsHref =
    roles.includes("supervisor") && !roles.some((role) => ["admin", "demo_admin", "executive_director", "executive_manager"].includes(role))
      ? "/supervisor/notifications"
      : roles.includes("executive_director") && !roles.some((role) => ["admin", "demo_admin"].includes(role))
        ? "/executive/notifications"
      : "/dashboard/notifications";

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-[var(--text)]">
      <header className="mobile-emerald-header sticky top-0 z-30 lg:hidden">
        <div className="flex h-20 items-center justify-between gap-3 px-4">
          <Brand compact />
          <div className="flex items-center gap-2">
            <HeaderPopovers compact notifications={notifications} allNotificationsHref={notificationsHref} />
            <MobileMenu roles={roles} />
          </div>
        </div>
      </header>

      <aside className="hidden lg:fixed lg:bottom-0 lg:right-0 lg:top-0 lg:z-40 lg:block lg:w-[252px]">
        <div className="luxury-sidebar h-full p-4 text-[var(--text)] lg:flex lg:min-h-0 lg:flex-col">
          <div className="hidden shrink-0 lg:block">
            <Brand />
          </div>

          <AppNav roles={roles} />

          <div className="sidebar-bottom hidden shrink-0 space-y-3 pt-4 lg:block">
            <QuranQuoteCard compact />

            <form action={signOut}>
              <button className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--gold)] hover:bg-[var(--gold-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/55">
                <LogOut aria-hidden="true" className="size-4" />
                <span>تسجيل خروج</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-10 pt-5 sm:px-6 lg:mr-[252px] lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-[1180px]">
          <TopHeader notifications={notifications} notificationsHref={notificationsHref} />
          <div className="mt-5">
            <Breadcrumbs />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className={`${compact ? "h-9 w-14" : "h-11 w-[4.5rem]"} shrink-0 overflow-hidden`}>
        <Image
          src="/logo-zikrukum-transparent.png"
          alt="ذكركم"
          width={96}
          height={44}
          className="h-full w-full object-contain"
        />
      </span>
      <span className="leading-tight">
        <span className={`${compact ? "text-base text-white" : "text-xl text-[var(--primary-dark)]"} block font-bold`}>
          منصة جمعية ذكركم
        </span>
        <span className={`${compact ? "text-xs text-[var(--gold-soft)]" : "text-sm text-[var(--gold)]"} block font-bold`}>
          لتحفيظ القرآن الكريم
        </span>
      </span>
    </Link>
  );
}

function TopHeader({
  notifications,
  notificationsHref,
}: {
  notifications: Awaited<ReturnType<typeof getUserNotifications>>["notifications"];
  notificationsHref: string;
}) {
  const today = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)]/95 px-5 py-4 text-[var(--text)] shadow-[var(--shadow-sm)] backdrop-blur lg:flex lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-bold text-[var(--gold)]">منصة جمعية ذكركم لتحفيظ القرآن الكريم</p>
        <h2 className="mt-1 text-lg font-bold text-[var(--primary-dark)]">
          أهلاً بك في لوحة العمل
        </h2>
      </div>
      <div className="flex items-center gap-4 text-sm font-bold text-[var(--muted)]">
        <span className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-2">
          <Calendar aria-hidden="true" className="size-4 text-[var(--gold)]" />
          {today}
        </span>
        <HeaderPopovers notifications={notifications} allNotificationsHref={notificationsHref} />
      </div>
    </header>
  );
}
