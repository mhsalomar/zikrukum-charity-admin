"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import { finalizeAccountSetup } from "./actions";

function translatePasswordError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("weak") || lower.includes("password")) {
    return "كلمة المرور غير مقبولة. استخدم 8 أحرف على الأقل مع تركيبة أوضح.";
  }
  if (lower.includes("expired") || lower.includes("invalid")) {
    return "رابط الدعوة غير صالح أو منتهي الصلاحية. اطلب دعوة جديدة من الإدارة.";
  }
  return "تعذر حفظ كلمة المرور. حاول مرة أخرى أو تواصل مع الإدارة.";
}

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // 1. PKCE: code in query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { setSessionReady(true); return; }
        setError("رابط منتهي الصلاحية");
        return;
      }

      // 2. Implicit: parse hash directly
      const hash = window.location.hash.substring(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) { setSessionReady(true); return; }
          setError("رابط منتهي الصلاحية");
          return;
        }
      }

      // 3. Already have session
      const { data } = await supabase.auth.getSession();
      if (data.session) { setSessionReady(true); return; }

      setError("لا يوجد رابط صالح — اطلب رابطاً جديداً من الإدارة");
    }

    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("كلمة المرور 8 أحرف على الأقل"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(translatePasswordError(updateError.message)); setLoading(false); return; }
    const finalize = await finalizeAccountSetup();
    if (!finalize.success) {
      setError(finalize.error ?? "تم حفظ كلمة المرور، لكن تعذر ربط الصلاحية");
      setLoading(false);
      return;
    }
    router.push("/auth/role-redirect");
  }

  if (!sessionReady) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-sm font-bold text-[#4f625a]">
          {error || "جاري التحقق من الرابط..."}
        </p>
      </main>
    );
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-[400px]">
        <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-[var(--shadow-md)]">
          <div className="h-[5px] w-full bg-gradient-to-l from-[#064e3b] via-[#047857] to-[#b58a3a]" />
          <div className="px-7 pb-8 pt-7">
            <h2 className="mb-2 text-center text-2xl font-bold text-[#052f24]">إنشاء كلمة المرور</h2>
            <p className="mb-7 text-center text-sm text-[#4f625a]">أنشئ كلمة مرور لحسابك في منصة ذكركم</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-[#052f24]">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                  placeholder="8 أحرف على الأقل"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[#052f24]">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                  placeholder="أعد كتابة كلمة المرور"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#047857] py-2 text-sm font-bold text-white hover:bg-[#064e3b] disabled:opacity-60"
              >
                {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
