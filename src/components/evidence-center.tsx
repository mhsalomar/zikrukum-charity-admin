import { AlertTriangle, ClipboardList, Upload } from "lucide-react";

export function EvidenceCenter() {
  return (
    <div className="space-y-5" dir="rtl">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">إرشاد تشغيلي</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">مركز الشواهد</h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[var(--muted)]">
            بعد انتهاء البرامج والفعاليات، تُجمع الشواهد وتُرفع يدويًا إلى Google Drive المعتمد لدى الجمعية.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p>المساحة المتاحة في Google Drive هي 15GB فقط.</p>
            <p className="mt-1 text-xs">للمقاطع الطويلة استخدم رابطًا خارجيًا أو نسخة مضغوطة. تجنب رفع الملفات الأكبر من 50MB إلا عند الحاجة الفعلية.</p>
          </div>
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Upload className="size-6 text-[var(--gold)]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-[var(--primary-dark)]">طريقة العمل</h2>
            <p className="text-sm font-bold text-[var(--muted)]">لا يوجد رفع ملفات أو تكامل خارجي من داخل المنصة في هذه المرحلة.</p>
          </div>
        </div>
        <ol className="mt-5 grid gap-3 text-sm font-bold text-[var(--primary-dark)] sm:grid-cols-2">
          {[
            "اجمع صور الفعالية أو التقرير أو المرفقات بعد انتهاء العمل.",
            "اختر الملفات المفيدة فقط واضغطها عند الحاجة.",
            "ارفع الملفات يدويًا إلى مجلد Google Drive المعتمد للجمعية.",
            "استخدم رابطًا خارجيًا للمقاطع الطويلة بدل النسخة الأصلية الكبيرة.",
          ].map((step, index) => (
            <li key={step} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3">
              <span className="ml-2 text-[var(--gold)]">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-6 text-[var(--gold)]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-[var(--primary-dark)]">تنظيم الشواهد</h2>
            <p className="text-sm font-bold text-[var(--muted)]">سمِّ الملفات بوضوح واربطها بالبرنامج أو الفعالية والتاريخ عند الحفظ اليدوي.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
