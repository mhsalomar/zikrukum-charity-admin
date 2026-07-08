"use client";

import { Download } from "lucide-react";

type Row = Record<string, string | number>;

export function CsvExportButton({ data, filename, label = "تصدير ملف البيانات" }: { data: Row[]; filename: string; label?: string }) {
  function handleExport() {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n") ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-2xl border border-[var(--gold)]/50 bg-[#fffdf8] px-4 py-2.5 text-sm font-semibold text-[#765514] shadow-sm transition hover:border-[var(--gold)] hover:bg-[#fff4d9]"
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
