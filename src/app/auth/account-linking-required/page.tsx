import Link from "next/link";

export default async function AccountLinkingRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.message ||
    "تم تسجيل الدخول، لكن لم يتم ربط حسابك بسجل داخلي. يرجى التواصل مع الإدارة.";

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <section className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elev)] p-7 text-center shadow-[var(--shadow-md)]">
        <div className="mx-auto mb-4 h-2 w-20 rounded-full bg-gradient-to-l from-[#064e3b] via-[#047857] to-[#b58a3a]" />
        <h1 className="text-2xl font-bold text-[#052f24]">الحساب يحتاج ربطًا داخليًا</h1>
        <p className="mt-4 text-sm font-bold leading-8 text-[#4f625a]">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0d6f4f] px-5 text-sm font-semibold text-white"
        >
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}
