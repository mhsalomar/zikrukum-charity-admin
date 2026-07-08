"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "طباعة / حفظ ملف قابل للطباعة" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0d6f4f] bg-[#0d6f4f] px-5 py-3 text-sm font-semibold text-white"
    >
      <Printer aria-hidden className="size-4" />
      {label}
    </button>
  );
}
