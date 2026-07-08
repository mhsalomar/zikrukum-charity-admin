"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { importExamParticipantsAction } from "@/app/dashboard/exams/actions";
import type { ExamOptionData, ExamParticipant } from "@/lib/exams";

type PreviewRow = {
  participant_name: string;
  student_id: string;
  halaqa_id: string;
  halaqa_name: string;
  teacher_name: string;
  exam_scope: string;
  notes: string;
  status: "ready" | "manual" | "duplicate" | "invalid" | "halaqa_missing" | "teacher_mismatch";
};

const aliases: Record<string, string[]> = {
  participant_name: ["اسم الطالب", "الطالب", "student_name", "participant_name"],
  halaqa_name: ["الحلقة", "اسم الحلقة", "halaqa_name"],
  teacher_name: ["المعلم", "اسم المعلم", "teacher_name"],
  exam_scope: ["مقدار الاختبار", "النطاق", "exam_scope", "scope"],
  notes: ["ملاحظات", "notes"],
};

export function ExamImportPanel({
  examId,
  options,
  participants,
}: {
  examId: string;
  options: ExamOptionData;
  participants: ExamParticipant[];
}) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const readyRows = useMemo(() => rows.filter((row) => row.status === "ready" || row.status === "manual"), [rows]);

  async function readFile(file: File) {
    setFileName(file.name);
    const rawRows = file.name.toLowerCase().endsWith(".csv")
      ? parseCsv(await file.text())
      : await parseExcel(file);
    setRows(rawRows.map((row) => normalizeRow(row, options, participants)));
  }

  return (
    <div className="grid gap-4">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--gold)] bg-[var(--gold-soft)] p-5 text-center">
        <FileSpreadsheet className="size-7 text-[var(--primary)]" aria-hidden />
        <span className="mt-2 text-sm font-semibold text-[var(--primary-dark)]">اختيار ملف الطلاب</span>
        <span className="mt-1 text-xs font-bold text-[var(--muted)]">{fileName || "ملف بيانات أو ملف جدول"}</span>
        <input
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
      </label>

      {rows.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="الصفوف المقروءة" value={rows.length} />
            <Metric label="جاهز للإضافة" value={readyRows.length} />
            <Metric label="مرتبط بطالب" value={rows.filter((row) => row.status === "ready").length} />
            <Metric label="يحتاج مراجعة" value={rows.filter((row) => !["ready", "manual"].includes(row.status)).length} />
          </div>
          <div className="max-h-80 overflow-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-[var(--gold-soft)] text-[var(--primary-dark)]">
                <tr><th className="p-3">الطالب</th><th className="p-3">الحلقة</th><th className="p-3">المعلم</th><th className="p-3">مقدار الاختبار</th><th className="p-3">الحالة</th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.participant_name}-${index}`} className="border-t border-[var(--border)]">
                    <td className="p-3 font-bold">{row.participant_name || "—"}</td>
                    <td className="p-3">{row.halaqa_name || "—"}</td>
                    <td className="p-3">{row.teacher_name || "—"}</td>
                    <td className="p-3">{row.exam_scope || "—"}</td>
                    <td className="p-3 font-semibold">{statusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={importExamParticipantsAction}>
            <input type="hidden" name="exam_id" value={examId} />
            <input type="hidden" name="rows" value={JSON.stringify(readyRows)} />
            <button disabled={readyRows.length === 0} className="primary-button inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              <Upload className="size-4" aria-hidden />
              إضافة الصفوف الجاهزة
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}

function normalizeRow(row: Record<string, unknown>, options: ExamOptionData, participants: ExamParticipant[]): PreviewRow {
  const participantName = field(row, "participant_name");
  const halaqaName = field(row, "halaqa_name");
  const student = options.students.find((item) => normalize(item.name) === normalize(participantName));
  const halaqa = options.halaqat.find((item) => normalize(item.name) === normalize(halaqaName));
  const suppliedTeacher = field(row, "teacher_name");
  const duplicate = participants.some((item) =>
    student ? item.studentId === student.id : normalize(item.participantName) === normalize(participantName) && normalize(item.halaqaName) === normalize(halaqaName),
  );
  const teacherMismatch = Boolean(halaqa && suppliedTeacher && normalize(halaqa.teacherName) !== normalize(suppliedTeacher));
  return {
    participant_name: participantName,
    student_id: student?.id ?? "",
    halaqa_id: student?.halaqaId || halaqa?.id || "",
    halaqa_name: student?.halaqaName || halaqa?.name || halaqaName,
    teacher_name: student?.teacherName || halaqa?.teacherName || suppliedTeacher,
    exam_scope: field(row, "exam_scope"),
    notes: field(row, "notes"),
    status: !participantName ? "invalid" : duplicate ? "duplicate" : !student && halaqaName && !halaqa ? "halaqa_missing" : teacherMismatch ? "teacher_mismatch" : student ? "ready" : "manual",
  };
}

async function parseExcel(file: File) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, index) => {
    const values = row.values as unknown[];
    if (index === 1) {
      values.slice(1).forEach((value) => headers.push(String(value ?? "").trim()));
      return;
    }
    const item: Record<string, unknown> = {};
    headers.forEach((header, column) => { item[header] = values[column + 1] ?? ""; });
    if (Object.values(item).some(Boolean)) rows.push(item);
  });
  return rows;
}

function parseCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = splitCsv(lines[0] ?? "");
  return lines.slice(1).map((line) => Object.fromEntries(splitCsv(line).map((cell, index) => [headers[index], cell])));
}
function splitCsv(line: string) {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}
function field(row: Record<string, unknown>, key: string) {
  for (const alias of aliases[key]) {
    const found = Object.keys(row).find((header) => normalize(header) === normalize(alias));
    if (found) return String(row[found] ?? "").trim();
  }
  return "";
}
function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function statusLabel(status: PreviewRow["status"]) {
  return { ready: "طالب مطابق وجاهز", manual: "طالب غير موجود — سيضاف للاختبار فقط", duplicate: "مكرر", invalid: "ناقص بيانات", halaqa_missing: "الحلقة غير موجودة", teacher_mismatch: "المعلم غير مطابق" }[status];
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--border)] bg-white p-3"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-bold text-[var(--primary-dark)]">{value}</p></div>;
}
