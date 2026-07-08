"use client";

import { Bell, Mail, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { NotificationItem } from "@/lib/notifications";

type PopoverKind = "notifications" | "messages";

export function HeaderPopovers({
  compact = false,
  notifications = [],
  allNotificationsHref = "/dashboard/notifications",
}: {
  compact?: boolean;
  notifications?: NotificationItem[];
  allNotificationsHref?: string;
}) {
  const [open, setOpen] = useState<PopoverKind | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = containerRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      setPosition({ top: rect.bottom + 10, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <HeaderButton
        icon={Bell}
        label="الإشعارات"
        active={open === "notifications"}
        compact={compact}
        badgeCount={unreadCount}
        onClick={() => setOpen(open === "notifications" ? null : "notifications")}
      />
      <HeaderButton
        icon={Mail}
        label="الرسائل"
        active={open === "messages"}
        compact={compact}
        badgeCount={0}
        onClick={() => setOpen(open === "messages" ? null : "messages")}
      />

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={popoverRef}
          dir="rtl"
          style={{ top: position.top, left: position.left, width: "min(360px, calc(100vw - 24px))" }}
          className="fixed z-[9999] rounded-2xl border border-[var(--line)] bg-white p-4 text-right shadow-2xl shadow-black/20"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--primary-dark)]">
              {open === "notifications" ? "الإشعارات" : "الرسائل"}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="grid size-8 place-items-center rounded-xl border border-[var(--line)] bg-[#fffdf8]"
              aria-label="إغلاق"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          {open === "notifications" ? (
            notifications.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-4">
                <p className="text-sm font-semibold text-[var(--text)]">لا توجد إشعارات جديدة</p>
                <p className="mt-2 text-xs font-semibold leading-6 text-[var(--muted)]">ستظهر التنبيهات الداخلية هنا عند إرسالها من الإدارة.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {notifications.slice(0, 5).map((notification) => (
                  <a
                    key={notification.recipientId}
                    href={notification.linkUrl ?? allNotificationsHref}
                    className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-right transition hover:border-[var(--gold)]"
                  >
                    <p className="text-sm font-semibold text-[var(--primary-dark)]">{notification.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-6 text-[var(--muted)]">{notification.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[var(--muted)]">
                        {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(notification.createdAt))}
                      </span>
                      {!notification.readAt ? <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">غير مقروء</span> : <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">مقروء</span>}
                    </div>
                  </a>
                ))}
                <a href={allNotificationsHref} className="rounded-xl border border-[var(--gold)]/50 bg-[#fff8e6] px-3 py-2 text-center text-xs font-semibold text-[#765514]">
                  عرض كل الإشعارات
                </a>
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">لا توجد رسائل حاليًا</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-[var(--muted)]">المراسلات الخارجية ليست مفعّلة في هذه المرحلة.</p>
            </div>
          )}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}

function HeaderButton({
  icon: Icon,
  label,
  active,
  compact,
  badgeCount,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  compact: boolean;
  badgeCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={label}
      title={label}
      className={`${compact ? "size-10 border-white/20 bg-white/10 text-white hover:bg-white/18" : "size-11 border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--primary-dark)] hover:border-[var(--gold)] hover:bg-[var(--primary-soft)]"} relative grid place-items-center rounded-[var(--radius-sm)] border transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50`}
    >
      <Icon aria-hidden="true" className="size-5" />
      {badgeCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </button>
  );
}
