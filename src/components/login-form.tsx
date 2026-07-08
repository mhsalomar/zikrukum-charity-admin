"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { getArabicAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(getArabicAuthError(signInError.message));
      return;
    }

    router.replace("/auth/role-redirect");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-[#052f24]">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full rounded-[0.9rem] border border-[#d8c9a8] bg-white px-4 text-base font-bold text-[#052f24] outline-none transition placeholder:text-[#7f8a83] focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/15"
          placeholder="أدخل البريد الإلكتروني"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-[#052f24]">
          كلمة المرور
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-[0.9rem] border border-[#d8c9a8] bg-white px-4 pl-12 text-base font-bold text-[#052f24] outline-none transition placeholder:text-[#7f8a83] focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/15"
            placeholder="********"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8a83] hover:text-[#047857] focus:outline-none"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-[0.9rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center rounded-[0.9rem] bg-[image:var(--grad-cta)] px-5 text-base font-bold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105 hover:shadow-[var(--shadow-cta-hover)] focus:outline-none focus:ring-4 focus:ring-[#047857]/22 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "جاري الدخول..." : "دخول"}
      </button>
    </form>
  );
}
