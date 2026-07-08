"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentProgressReportLink() {
  const pathname = usePathname();
  const href = pathname.startsWith("/executive")
    ? "/executive/reports/student-progress"
    : "/dashboard/reports/student-progress";

  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-2xl border border-[var(--gold)]/60 bg-[#fff8e6] px-5 py-3 text-sm font-semibold text-[#765514]">
      تقرير إنجاز الطلاب
    </Link>
  );
}
