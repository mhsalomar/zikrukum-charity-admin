"use client";

import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

import { signOut } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import type { AppRole } from "@/lib/roles";

export function MobileMenu({ roles }: { roles: AppRole[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50"
        aria-label="فتح القائمة"
      >
        <Menu aria-hidden="true" className="size-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
          />

          {/* sidebar panel */}
          <aside
            className="luxury-sidebar absolute inset-y-0 right-0 flex w-[min(82vw,320px)] flex-col shadow-2xl"
            style={{ height: "100dvh" }}
          >
            {/* header row */}
            <div className="flex shrink-0 items-center justify-between gap-3 p-4 pb-2">
              <div>
                <p className="text-base font-semibold text-[var(--primary-dark)]">
                  منصة جمعية ذكركم
                </p>
                <p className="text-xs font-bold text-[var(--gold)]">
                  لتحفيظ القرآن الكريم
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[#f7f5ef]"
                aria-label="إغلاق القائمة"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            {/* nav items — scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              <AppNav roles={roles} onNavigate={() => setOpen(false)} />
            </div>

            {/* footer */}
            <div className="shrink-0 space-y-3 p-4 pt-2">
              <form action={signOut}>
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#f7f5ef] px-4 py-3 text-sm font-semibold text-[var(--primary-dark)]">
                  <LogOut aria-hidden="true" className="size-4" />
                  تسجيل خروج
                </button>
              </form>
              <footer className="sidebar-footer rounded-[1rem] border border-[var(--line)] px-4 py-4 text-center">
                <div className="mx-auto mb-3 flex w-24 items-center justify-center gap-1.5">
                  <span className="h-px flex-1 bg-[var(--gold)]/55" />
                  <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                  <span className="h-px flex-1 bg-[var(--gold)]/55" />
                </div>
                <p className="text-[15px] font-semibold leading-7 text-[var(--primary-dark)]">
                  وقل رب زدني علما
                </p>
              </footer>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
