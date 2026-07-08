"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

export function ReportPrintLink() {
  return (
    <Link href="/reports-print" target="_blank" rel="noopener noreferrer" className="gold-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white">
      <Printer aria-hidden className="size-4" />
      طباعة تقرير رسمي
    </Link>
  );
}
