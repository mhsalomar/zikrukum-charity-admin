import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-2 text-sm font-semibold text-[var(--gold)]">الإعدادات</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
            إعدادات النظام
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            مساحة مختصرة لإدارة المستخدمين والدعوات ومراجعة جاهزية الخدمات الأساسية قبل التشغيل.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SettingsLinkCard
          href="/dashboard/users"
          title="المستخدمون والصلاحيات"
          description="إضافة مستخدم، ربط البريد بالدور، ومراجعة حالة الحسابات قبل إرسال الدعوات."
        />
        <SettingsLinkCard
          href="/dashboard/settings/invitations"
          title="الدعوات"
          description="إرسال دعوة محددة، إعادة الإرسال عند الحاجة، ومتابعة من أنشأ كلمة المرور."
        />
        <SettingsLinkCard
          href="/dashboard/settings/official-assets"
          title="الختم والتوقيع الرسمي"
          description="رفع وتحديث الختم والتوقيع المستخدمين في الطباعة الرسمية."
        />
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">
          الحالة الحالية
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoCard label="الخطة" value="الخطة التشغيلية الحالية" />
          <InfoCard label="التحليلات" value="غير مضافة" />
          <InfoCard label="قياس السرعة المدفوع" value="غير مضاف" />
          <InfoCard label="تكامل جوجل" value="غير مفعل حاليًا" />
          <InfoCard label="وحدات التشغيل" value="مفعّلة حسب الصلاحيات الحالية" />
          <InfoCard label="الأسرار" value="غير محفوظة داخل الكود" />
          <InfoCard label="الختم والتوقيع" value="قابلان للتحديث من داخل الموقع" />
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">الترويسة والطباعة</h2>
        <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted)]">
          صفحات الخطابات والتقارير تستخدم الختم والتوقيع الرسميين من التخزين الخاص، ويمكن تحديثهما من صفحة الختم والتوقيع الرسمي.
        </p>
      </section>
    </div>
  );
}

function SettingsLinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="app-card rounded-[1.6rem] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)]">
      <p className="text-lg font-bold text-[var(--primary-dark)]">{title}</p>
      <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{description}</p>
      <span className="mt-4 inline-flex rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
        فتح الصفحة
      </span>
    </Link>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <p className="text-xs font-bold text-[#81928b]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--primary-dark)]">
        {value}
      </p>
    </div>
  );
}
