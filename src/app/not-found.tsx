import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  description: "الصفحة التي تبحث عنها غير موجودة.",
};

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#f9f6f0] px-4 text-center"
    >
      <div className="mb-6 text-7xl font-semibold text-[#064e3b] opacity-20 select-none">
        ٤٠٤
      </div>
      <h1 className="mb-3 text-2xl font-bold text-[#052f24]">
        الصفحة غير موجودة
      </h1>
      <p className="mb-8 max-w-sm text-sm font-medium text-[#4f625a]">
        لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-[#064e3b] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#047857]"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  );
}
