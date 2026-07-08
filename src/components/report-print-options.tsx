"use client";

import { useEffect, useState } from "react";

import { PrintButton } from "@/components/print-button";

export function ReportPrintOptions() {
  const [showStamp, setShowStamp] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.reportStamp = showStamp ? "1" : "0";
    document.documentElement.dataset.reportSignature = showSignature ? "1" : "0";

    return () => {
      delete document.documentElement.dataset.reportStamp;
      delete document.documentElement.dataset.reportSignature;
    };
  }, [showStamp, showSignature]);

  return (
    <div className="no-print mx-auto mb-4 flex max-w-[794px] flex-col gap-3 rounded-2xl border border-[#d8c8a9] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 text-sm font-bold text-[#0b5d42]">
        <Toggle label="إظهار الختم" checked={showStamp} onChange={setShowStamp} />
        <Toggle label="إظهار التوقيع" checked={showSignature} onChange={setShowSignature} />
      </div>
      <PrintButton />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#d8c8a9] bg-[#fffdf8] px-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#0d6f4f]"
      />
      {label}
    </label>
  );
}
