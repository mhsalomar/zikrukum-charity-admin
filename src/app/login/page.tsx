import Image from "next/image";

import { LoginInviteHandler } from "@/components/login-invite-handler";
import { LoginForm } from "@/components/login-form";
import { QuranQuoteCard } from "@/components/quran-quote-card";

export default function LoginPage() {
  return (
    <main dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4">
      <LoginInviteHandler />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-l from-[var(--primary-2)] via-[var(--success)] to-[var(--primary-2)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.9),rgba(251,247,237,0)_34rem)]" />
        <div className="absolute -top-24 right-1/2 h-72 w-72 translate-x-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[430px] py-10 sm:py-14">
        {/* branding */}
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-zikrukum-transparent.png"
            alt="شعار جمعية ذكركم"
            width={340}
            height={154}
            priority
            className="block h-auto w-[250px] max-w-[76vw] object-contain"
          />
          <div className="mx-auto h-px w-28 bg-gradient-to-r from-transparent via-[var(--gold)]/55 to-transparent" />
          <p className="text-sm font-semibold leading-7 text-[var(--primary-2)]">
            منصة إدارة جمعية ذكركم لتحفيظ القرآن الكريم
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[var(--radius-lg)] [border-start-start-radius:var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-[var(--shadow-lift)] ring-1 ring-white/60">
          <div className="h-[5px] w-full bg-gradient-to-l from-[var(--primary-2)] via-[var(--success)] to-[var(--gold)]" />
          <div className="px-7 pb-9 pt-8 sm:px-9">
            <h2 className="font-display mb-2 text-center text-2xl font-bold text-[var(--primary-dark)]">
              تسجيل الدخول
            </h2>
            <p className="mb-7 text-center text-sm font-bold text-[var(--muted)]">
              أدخل بيانات حسابك للمتابعة
            </p>
            <LoginForm />
          </div>
        </section>

        <QuranQuoteCard compact className="mx-auto mt-5 max-w-[360px] shadow-[0_16px_36px_rgba(6,78,59,0.08)]" />

        <p className="mt-7 text-center text-xs font-bold text-[var(--muted)]">
          جميع الحقوق محفوظة © جمعية ذكركم ١٤٤٧ هـ
        </p>
      </div>
    </main>
  );
}
