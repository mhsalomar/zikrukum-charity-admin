import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";

type ModuleAction = {
  label: string;
  status: "ready" | "planned" | "requires-schema";
};

export function ModuleScaffold({
  title,
  eyebrow,
  description,
  icon: Icon,
  actions,
  nextStep,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  icon: LucideIcon;
  actions: ModuleAction[];
  nextStep: string;
}) {
  return (
    <div className="space-y-5">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white shadow-2xl shadow-[#053828]/15">
        <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-bold sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d9eee5] sm:text-base">
              {description}
            </p>
          </div>
          <span className="grid size-20 place-items-center rounded-[1.4rem] border border-[var(--gold)]/45 bg-white/12 text-[var(--gold-soft)] shadow-lg shadow-black/10 backdrop-blur">
            <Icon aria-hidden="true" className="size-10" />
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-card rounded-[1.6rem] p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--gold-soft)] text-[var(--primary-dark)]">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[var(--gold)]">
                نطاق الوحدة
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--primary-dark)]">
                ما الذي تغطيه هذه الصفحة؟
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {actions.map((action) => (
              <div
                key={action.label}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4"
              >
                <StatusIcon status={action.status} />
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {action.label}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">
                    {statusText[action.status]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="app-card rounded-[1.6rem] p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fff8e6] text-[#765514]">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-[var(--primary-dark)]">
              حالة الجاهزية
            </h2>
          </div>
          <p className="mt-4 text-sm font-semibold leading-7 text-[var(--muted)]">
            الصفحة مهيأة للعمل ضمن النظام الحالي، وتعرض المتاح من البيانات مع
            رسائل واضحة عند نقص المتطلبات أو الحاجة إلى مراجعة إدارية.
          </p>
          <div className="mt-5 rounded-2xl border border-[var(--gold)]/35 bg-[#fff8e6] p-4">
            <p className="text-xs font-semibold text-[#765514]">الخطوة التالية</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--primary-dark)]">
              {nextStep}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:border-[var(--gold)]"
          >
            العودة للرئيسية
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </aside>
      </section>
    </div>
  );
}

const statusText = {
  ready: "جاهز للاستخدام ضمن النظام الحالي.",
  planned: "مجدول ضمن خطة التطوير القادمة.",
  "requires-schema": "جاهز للمراجعة، ويحتاج اعتماد الإعدادات التشغيلية قبل الاستخدام الكامل.",
};

function StatusIcon({ status }: { status: ModuleAction["status"] }) {
  if (status === "ready") {
    return (
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f5ee] text-[var(--primary-dark)]">
        <CheckCircle2 aria-hidden="true" className="size-5" />
      </span>
    );
  }

  return (
    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff8e6] text-[#765514]">
      <LockKeyhole aria-hidden="true" className="size-5" />
    </span>
  );
}
