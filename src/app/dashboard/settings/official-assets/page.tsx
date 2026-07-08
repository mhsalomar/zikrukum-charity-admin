import Link from "next/link";
import { UploadCloud } from "lucide-react";

import { PageHero, SectionCard } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

import { uploadOfficialAsset } from "./actions";

const errorMessages: Record<string, string> = {
  missing: "اختر ملفًا قبل الحفظ.",
  type: "صيغة الملف غير مدعومة. استخدم PNG أو JPG أو WEBP.",
  size: "حجم الملف أكبر من 5MB.",
  bucket: "تعذر التحقق من bucket الأصول الرسمية أو أنه ليس خاصًا.",
  upload: "تعذر رفع الملف. حاول مرة أخرى.",
};

const updatedMessages: Record<string, string> = {
  stamp: "تم تحديث الختم الرسمي.",
  signature: "تم تحديث توقيع رئيس مجلس الإدارة.",
};

export default async function OfficialAssetsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const statusMessage = params.updated ? updatedMessages[params.updated] : "";
  const errorMessage = params.error ? errorMessages[params.error] ?? "حدث خطأ غير متوقع." : "";
  const cacheKey = params.updated ? `?v=${encodeURIComponent(params.updated)}` : "";

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="الإعدادات"
        title="الختم والتوقيع الرسمي"
        description="رفع وتحديث الأصول الرسمية المستخدمة في الخطابات والتقارير المطبوعة."
        actions={
          <Link href="/dashboard/settings" className="secondary-button inline-flex min-h-11 items-center rounded-2xl px-5 text-sm font-semibold">
            العودة للإعدادات
          </Link>
        }
      />

      {statusMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <AssetCard
          title="الختم الرسمي"
          description="يظهر في أقصى يمين تذييل الطباعة."
          asset="stamp"
          imageSrc={`/api/official-assets/stamp${cacheKey}`}
        />
        <AssetCard
          title="توقيع رئيس مجلس الإدارة"
          description="يظهر في أقصى يسار تذييل الطباعة."
          asset="signature"
          imageSrc={`/api/official-assets/signature${cacheKey}`}
        />
      </section>

      <SectionCard title="تنبيه أمان" icon={UploadCloud}>
        <p className="text-sm font-bold leading-7 text-[var(--muted)]">
          الملفات تُرفع إلى bucket خاص في Supabase Storage ولا توضع في Git أو داخل public.
          التحديث يظهر في صفحات الطباعة للمستخدمين المصرح لهم فقط.
        </p>
      </SectionCard>
    </div>
  );
}

function AssetCard({
  title,
  description,
  asset,
  imageSrc,
}: {
  title: string;
  description: string;
  asset: "stamp" | "signature";
  imageSrc: string;
}) {
  return (
    <section className="app-card rounded-[1.6rem] p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{description}</p>
      </div>

      <div className="mt-5 grid min-h-40 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={title} className="max-h-32 max-w-full object-contain" />
      </div>

      <form action={uploadOfficialAsset} className="mt-5 space-y-3">
        <input type="hidden" name="asset" value={asset} />
        <label className="block text-sm font-bold text-[var(--text)]">
          رفع ملف جديد
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="mt-2 block w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold file:ml-4 file:rounded-xl file:border-0 file:bg-[var(--gold-soft)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[var(--primary-dark)]"
          />
        </label>
        <button className="primary-button min-h-11 w-full rounded-2xl px-5 text-sm font-semibold">
          حفظ {title}
        </button>
      </form>
    </section>
  );
}
