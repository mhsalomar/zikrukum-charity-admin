"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  previewStaffImportRows,
  saveStaffImportRows,
} from "@/app/dashboard/staff-import-actions";
import {
  mapStaffImportRows,
  staffImportFields,
  staffImportLabels,
  type StaffImportKind,
  type StaffImportPreviewRow,
  type StaffImportRow,
} from "@/lib/staff-import";

const statusLabels: Record<StaffImportPreviewRow["status"], string> = {
  matched: "مطابق وسيتم تحديثه",
  new: "جديد",
  duplicate: "مكرر",
  missing_data: "ناقص بيانات",
  invalid_iban: "آيبان غير صحيح",
  invalid_identity: "هوية غير صحيحة",
  invalid_email: "بريد غير صحيح",
  invalid_phone: "جوال غير صحيح",
  missing_halaqa: "حلقة غير موجودة",
};

export function StaffBulkImporter({ kind }: { kind: StaffImportKind }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<StaffImportRow[]>([]);
  const [preview, setPreview] = useState<StaffImportPreviewRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => ({
      total: preview.length,
      matched: preview.filter((row) => row.status === "matched").length,
      fresh: preview.filter((row) => row.status === "new").length,
      blocked: preview.filter((row) => !row.canSave).length,
      ready: preview.filter((row) => row.canSave).length,
    }),
    [preview],
  );

  async function readFile(file?: File) {
    setResult("");
    setErrors([]);
    setPreview([]);
    if (!file) return;
    setFileName(file.name);

    try {
      const parsed = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : await parseWorkbook(file);
      setRows(parsed.rows);
      if (parsed.errors.length > 0) {
        setErrors(parsed.errors);
        return;
      }
      startTransition(async () => {
        const response = await previewStaffImportRows(parsed.rows, kind);
        setPreview(response.preview);
        setErrors(response.errors);
      });
    } catch {
      setRows([]);
      setErrors(["تعذر قراءة الملف. استخدم ملف جدول أو ملف بيانات صالحًا."]);
    }
  }

  function saveRows() {
    startTransition(async () => {
      const response = await saveStaffImportRows(rows, kind);
      setPreview(response.preview);
      setErrors(response.errors);
      if (response.savedCount > 0) {
        const parts = [`تم حفظ ${response.savedCount} سجل: ${response.createdCount} جديد، ${response.updatedCount} محدث.`];
        if (response.identityUpdatedCount > 0) parts.push(`هوية محفوظة: ${response.identityUpdatedCount}.`);
        if (response.ibanUpdatedCount > 0) parts.push(`آيبان محفوظ: ${response.ibanUpdatedCount}.`);
        setResult(parts.join(" "));
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-xs font-semibold text-[var(--primary-dark)]"
        >
          <Download aria-hidden className="size-4" />
          تحميل قالب الاستيراد
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary-dark)] px-4 text-xs font-semibold text-white"
        >
          <UploadCloud aria-hidden className="size-4" />
          استيراد بيانات
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
          <section className="app-card max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--gold)]">
                  {kind === "teacher" ? "المعلمون" : "المشرفون"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
                  استيراد البيانات
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]"
                aria-label="إغلاق"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="gold-button inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
                <FileSpreadsheet aria-hidden className="size-5" />
                اختيار ملف
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(event) => readFile(event.target.files?.[0])}
                />
              </label>
              <span className="text-sm font-bold text-[var(--muted)]">
                {fileName || "لم يتم اختيار ملف بعد"}
              </span>
              <button
                type="button"
                onClick={() => downloadErrorReport(preview)}
                disabled={preview.length === 0 || preview.every((row) => row.canSave)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] px-5 text-sm font-semibold text-[var(--primary-dark)] disabled:opacity-45"
              >
                <Download aria-hidden className="size-4" />
                تحميل تقرير الأخطاء
              </button>
              <button
                type="button"
                onClick={saveRows}
                disabled={summary.ready === 0 || isPending}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--primary-dark)] px-5 text-sm font-semibold text-white disabled:opacity-45"
              >
                {isPending ? "جارٍ المعالجة..." : `حفظ الصفوف الجاهزة (${summary.ready})`}
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              <Summary label="الصفوف المقروءة" value={summary.total} />
              <Summary label="مطابق وسيحدث" value={summary.matched} />
              <Summary label="جديد" value={summary.fresh} />
              <Summary label="جاهز للحفظ" value={summary.ready} />
              <Summary label="يحتاج تصحيحًا" value={summary.blocked} warning />
            </div>

            <Messages errors={errors} result={result} />

            <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--line)]">
              <table className="formal-table w-full min-w-[1180px] text-right text-sm">
                <thead>
                  <tr>
                    {["السطر", "الحالة", "الاسم", "الهوية/الإقامة", "الجوال", "البريد", "البنك", "الآيبان", "الحلقات", "التوضيح"].map(
                      (heading) => <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>,
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center font-bold text-[var(--muted)]">
                        ارفع ملفًا لعرض المعاينة قبل الحفظ.
                      </td>
                    </tr>
                  ) : preview.slice(0, 150).map((item) => (
                    <tr key={`${item.rowNumber}-${item.row.full_name}`}>
                      <td className="px-4 py-4 font-semibold">{item.rowNumber}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.canSave ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[var(--primary-dark)]">{item.row.full_name || "—"}</td>
                      <td className="px-4 py-4">{maskTail(item.row.national_id, 2)}</td>
                      <td className="px-4 py-4">{item.row.phone || "—"}</td>
                      <td className="px-4 py-4">{item.row.email || "—"}</td>
                      <td className="px-4 py-4">{item.row.bank_name || "—"}</td>
                      <td className="px-4 py-4">{maskTail(item.row.iban, 4)}</td>
                      <td className="px-4 py-4">{item.row.halaqat || "—"}</td>
                      <td className="px-4 py-4 text-xs font-bold text-[var(--muted)]">{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

async function parseWorkbook(file: File) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return mapStaffImportRows([]);
  const rows: string[][] = [];
  worksheet.eachRow((row) => rows.push((row.values as unknown[]).slice(1).map(formatCell)));
  return mapStaffImportRows(rows);
}

function parseCsv(content: string) {
  return mapStaffImportRows(
    content
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map(splitCsvLine),
  );
}

function downloadTemplate() {
  const headers = staffImportFields.map((field) => staffImportLabels[field]);
  downloadCsv("قالب-استيراد-بيانات-المعلمين-والمشرفين.csv", [headers]);
}

function downloadErrorReport(preview: StaffImportPreviewRow[]) {
  const rows = preview
    .filter((row) => !row.canSave)
    .map((row) => [
      String(row.rowNumber),
      row.row.full_name,
      statusLabels[row.status],
      row.message,
      row.row.email || "",
      row.row.halaqat || "",
    ]);
  downloadCsv("تقرير-أخطاء-استيراد-المعلمين-والمشرفين.csv", [
    ["رقم السطر", "الاسم", "الحالة", "سبب الخطأ", "البريد", "الحلقات"],
    ...rows,
  ]);
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function formatCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "");
  if (value && typeof value === "object" && "result" in value) return String((value as { result?: unknown }).result ?? "");
  return value === null || value === undefined ? "" : String(value);
}

function maskTail(value: string | undefined, visible: number) {
  const clean = String(value ?? "").replace(/\s+/g, "");
  if (!clean) return "—";
  return `${"*".repeat(Math.max(4, clean.length - visible))}${clean.slice(-visible)}`;
}

function Summary({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${warning ? "border-amber-200 bg-amber-50" : "border-[var(--line)] bg-[#fffdf8]"}`}>
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function Messages({ errors, result }: { errors: string[]; result: string }) {
  return (
    <div className="mt-5 space-y-2">
      {result ? (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <CheckCircle2 aria-hidden className="size-5" />
          {result}
        </p>
      ) : null}
      {errors.map((error) => (
        <p key={error} className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle aria-hidden className="size-5" />
          {error}
        </p>
      ))}
    </div>
  );
}

