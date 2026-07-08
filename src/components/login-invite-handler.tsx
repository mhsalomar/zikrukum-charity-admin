"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LoginInviteHandler() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleInviteHash() {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        router.replace(`/auth/set-password?code=${encodeURIComponent(code)}`);
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (!accessToken || !refreshToken) {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/auth/role-redirect");
          router.refresh();
        }
        return;
      }

      setProcessing(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError("رابط الدعوة غير صالح أو منتهي الصلاحية. اطلب دعوة جديدة من الإدارة.");
        setProcessing(false);
        return;
      }

      router.replace(type === "invite" || type === "recovery" ? "/auth/set-password" : "/auth/role-redirect");
      router.refresh();
    }

    handleInviteHash();
  }, [router]);

  if (!processing && !error) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)] px-4" dir="rtl">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elev)] p-7 text-center shadow-[var(--shadow-md)]">
        <div className="mx-auto mb-4 h-2 w-20 rounded-full bg-gradient-to-l from-[#064e3b] via-[#047857] to-[#b58a3a]" />
        <h1 className="text-2xl font-bold text-[#052f24]">
          {error ? "تعذر فتح رابط الدعوة" : "جاري فتح صفحة إنشاء كلمة المرور"}
        </h1>
        <p className="mt-3 text-sm font-bold leading-7 text-[#4f625a]">
          {error ? "يمكنك طلب دعوة جديدة من الإدارة." : "يتم التحقق من رابط الدعوة وتجهيز حسابك."}
        </p>
        {error ? (
          <p className="mt-4 rounded-[0.9rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
