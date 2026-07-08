import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Calendar, LogOut } from "lucide-react";

import { signOut } from "@/app/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HeaderPopovers } from "@/components/header-popovers";
import { QuranQuoteCard } from "@/components/quran-quote-card";
import type { getUserNotifications } from "@/lib/notifications";

type PortalIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

export type PortalNavItem = {
  href: string;
  label: string;
  icon: PortalIcon;
};

export function PortalLayoutShell({
  children,
  title,
  subtitle,
  homeHref,
  icon: Icon,
  navItems,
  mobileItems,
  notifications,
  notificationsHref,
  showBreadcrumbs = true,
  contentMode = "contained",
  userName,
  userRole,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  homeHref: string;
  icon: PortalIcon;
  navItems: PortalNavItem[];
  mobileItems?: PortalNavItem[];
  notifications: Awaited<ReturnType<typeof getUserNotifications>>["notifications"];
  notificationsHref: string;
  userName?: string;
  userRole?: string;
  showBreadcrumbs?: boolean;
  contentMode?: "contained" | "free";
}) {
  const today = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const bottomItems = mobileItems ?? navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]" dir="rtl">
      <header className="mobile-emerald-header sticky top-0 z-40 lg:hidden">
        <div className="flex h-20 items-center justify-between gap-3 px-4">
          <PortalBrand href={homeHref} title={title} subtitle={subtitle} icon={Icon} compact />
          <div className="flex items-center gap-2">
            <HeaderPopovers compact notifications={notifications} allNotificationsHref={notificationsHref} />
            <form action={signOut}>
              <button className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white" aria-label="تسجيل خروج">
                <LogOut aria-hidden className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <aside className="hidden lg:fixed lg:bottom-0 lg:right-0 lg:top-0 lg:z-40 lg:block lg:w-[252px]">
        <div className="luxury-sidebar flex h-full min-h-0 flex-col p-4">
          <PortalBrand href={homeHref} title={title} subtitle={subtitle} icon={Icon} />
          <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {navItems.map((item) => (
              <PortalSidebarLink key={item.href} item={item} />
            ))}
          </nav>
          <div className="shrink-0 space-y-3 pt-4">
            <QuranQuoteCard compact />
            <form action={signOut}>
              <button className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--gold)] hover:bg-[var(--gold-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/55">
                <LogOut aria-hidden className="size-4" />
                <span>تسجيل خروج</span>
              </button>
            </form>
            <footer className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--gold-soft)] px-4 py-3 text-center">
              {userName ? (
                <>
                  <p className="text-xs font-bold text-[var(--muted)]">{userRole ?? subtitle}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-[var(--primary-dark)]">{userName}</p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{today}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold leading-6 text-[var(--muted)]">بوابة عمل رسمية</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--primary-dark)]">{subtitle}</p>
                </>
              )}
            </footer>
          </div>
        </div>
      </aside>

      <main className="min-w-0 pb-24 lg:mr-[252px] lg:pb-10">
        <div className={contentMode === "contained" ? "mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8 lg:py-6" : "pt-5 lg:px-8 lg:py-6"}>
          <header className="mb-5 hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)]/95 px-5 py-4 text-[var(--text)] shadow-[var(--shadow-sm)] backdrop-blur lg:flex lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--gold)]">{title}</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--primary-dark)]">{subtitle}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-[var(--muted)]">
              <span className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-2">
                <Calendar aria-hidden className="size-4 text-[var(--gold)]" />
                {today}
              </span>
              <HeaderPopovers notifications={notifications} allNotificationsHref={notificationsHref} />
            </div>
          </header>
          {showBreadcrumbs ? <Breadcrumbs /> : null}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg-elev)]/95 px-3 py-2 shadow-[0_-10px_30px_rgba(31,41,51,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(bottomItems.length, 5)}, minmax(0, 1fr))` }}>
          {bottomItems.slice(0, 5).map((item) => (
            <MobilePortalLink key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function PortalBrand({
  href,
  title,
  subtitle,
  icon: Icon,
  compact = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: PortalIcon;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className={`${compact ? "size-11 border-white/20 bg-white/10 text-[var(--gold-soft)]" : "size-12 border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--primary-dark)]"} grid shrink-0 place-items-center rounded-[var(--radius-sm)] border`}>
        <Icon aria-hidden className="size-6" />
      </span>
      <span className="leading-tight">
        <span className={`${compact ? "text-base text-white" : "text-lg text-[var(--primary-dark)]"} block font-bold`}>{title}</span>
        <span className={`${compact ? "text-xs text-[var(--gold-soft)]" : "text-sm text-[var(--gold)]"} block font-bold`}>{subtitle}</span>
      </span>
    </Link>
  );
}

function PortalSidebarLink({ item }: { item: PortalNavItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-transparent px-4 py-3 text-sm font-semibold text-[#3d4944] transition hover:border-[var(--border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]">
      <Icon aria-hidden className="size-5 text-[var(--gold)]" />
      <span>{item.label}</span>
    </Link>
  );
}

function MobilePortalLink({ item }: { item: PortalNavItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2 py-2 text-xs font-semibold text-[var(--primary-dark)]">
      <Icon aria-hidden className="size-5 text-[var(--gold)]" />
      <span>{item.label}</span>
    </Link>
  );
}
