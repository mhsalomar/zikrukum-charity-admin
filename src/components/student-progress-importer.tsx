"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { importStudentProgressRows, type StudentProgressImportRow } from "@/app/dashboard/students/import/actions";

type HalaqaOption = {
  id: string;
  name: string;
  teacherName: string;
  mosqueName: string;
};

type StudentOption = {
  id: string;
  fullName: string;
};

type EnrollmentOption = {
  studentName: string;
  studentId: string;
  halaqaId: string;
};

type ProgressRecordOption = {
  studentId: string;
  halaqaId: string;
  progressDate: string;
  memorizationSurahName: string;
  memorizationFromAyah: string;
  memorizationToAyah: string;
  reviewSurahName: string;
  reviewFromAyah: string;
  reviewToAyah: string;
};

type ParseState = {
  rows: StudentProgressImportRow[];
  errors: string[];
  warnings: string[];
  fileName: string;
};

type PreviewStatus =
  | "ready"
  | "existing_update"
  | "new_student"
  | "missing_halaqa"
  | "teacher_mismatch"
  | "missing_data"
  | "duplicate"
  | "needs_review"
  | "existing_progress_update";

type PreviewRow = {
  row: StudentProgressImportRow;
  rowNumber: number;
  status: PreviewStatus;
  label: string;
  severity: "ready" | "review" | "blocked";
  reason: string;
  suggestion: string;
  canSave: boolean;
};

const FIELD_LABELS: Record<keyof StudentProgressImportRow, string> = {
  student_name: "اسم الطالب",
  halaqa_name: "الحلقة",
  teacher_name: "المعلم",
  mosque_name: "المسجد",
  level: "المستوى",
  memorization_surah_name: "سورة الحفظ",
  memorization_from_ayah: "من آية",
  memorization_to_ayah: "إلى آية",
  review_surah_name: "سورة المراجعة",
  review_from_ayah: "مراجعة من آية",
  review_to_ayah: "مراجعة إلى آية",
  memorization_pages: "صفحات الحفظ",
  review_pages: "صفحات المراجعة",
  progress_date: "تاريخ المنجز",
  notes: "ملاحظات",
};

const TEMPLATE_FIELDS: (keyof StudentProgressImportRow)[] = [
  "student_name",
  "halaqa_name",
  "teacher_name",
  "mosque_name",
  "level",
  "memorization_surah_name",
  "memorization_from_ayah",
  "memorization_to_ayah",
  "review_surah_name",
  "review_from_ayah",
  "review_to_ayah",
  "memorization_pages",
  "review_pages",
  "progress_date",
  "notes",
];

const HEADER_ALIASES: Record<string, keyof StudentProgressImportRow> = {
  "اسم الطالب": "student_name",
  "الطالب": "student_name",
  "اسم المستفيد": "student_name",
  student_name: "student_name",
  name: "student_name",
  "اسم الحلقة": "halaqa_name",
  "الحلقة": "halaqa_name",
  "حلقة": "halaqa_name",
  halaqa_name: "halaqa_name",
  circle_name: "halaqa_name",
  "المعلم": "teacher_name",
  "اسم المعلم": "teacher_name",
  teacher_name: "teacher_name",
  "المسجد": "mosque_name",
  "اسم المسجد": "mosque_name",
  mosque_name: "mosque_name",
  "المستوى": "level",
  "المرحلة": "level",
  level: "level",
  "آخر سورة حفظ": "memorization_surah_name",
  "سورة الحفظ": "memorization_surah_name",
  "الحفظ": "memorization_surah_name",
  memorization_surah_name: "memorization_surah_name",
  "من آية حفظ": "memorization_from_ayah",
  "حفظ من آية": "memorization_from_ayah",
  "من آية": "memorization_from_ayah",
  memorization_from_ayah: "memorization_from_ayah",
  "إلى آية حفظ": "memorization_to_ayah",
  "حفظ إلى آية": "memorization_to_ayah",
  "الى آية": "memorization_to_ayah",
  "إلى آية": "memorization_to_ayah",
  memorization_to_ayah: "memorization_to_ayah",
  "آخر سورة مراجعة": "review_surah_name",
  "سورة المراجعة": "review_surah_name",
  "المراجعة": "review_surah_name",
  review_surah_name: "review_surah_name",
  "من آية مراجعة": "review_from_ayah",
  "مراجعة من آية": "review_from_ayah",
  review_from_ayah: "review_from_ayah",
  "إلى آية مراجعة": "review_to_ayah",
  "الى آية مراجعة": "review_to_ayah",
  "مراجعة إلى آية": "review_to_ayah",
  review_to_ayah: "review_to_ayah",
  "عدد الأوجه المنجزة": "memorization_pages",
  "عدد أوجه الحفظ": "memorization_pages",
  "أوجه الحفظ": "memorization_pages",
  "صفحات الحفظ": "memorization_pages",
  memorization_pages: "memorization_pages",
  "عدد أوجه المراجعة": "review_pages",
  "أوجه المراجعة": "review_pages",
  "صفحات المراجعة": "review_pages",
  review_pages: "review_pages",
  "آخر تاريخ تحديث": "progress_date",
  "تاريخ المنجز": "progress_date",
  "التاريخ": "progress_date",
  progress_date: "progress_date",
  date: "progress_date",
  "ملاحظات": "notes",
  "الملاحظات": "notes",
  notes: "notes",
};

export function StudentProgressImporter({
  halaqat,
  students,
  enrollments,
  progressRecords,
}: {
  halaqat: HalaqaOption[];
  students: StudentOption[];
  enrollments: EnrollmentOption[];
  progressRecords: ProgressRecordOption[];
}) {
  const [state, setState] = useState<ParseState>({ rows: [], errors: [], warnings: [], fileName: "" });
  const [result, setResult] = useState("");
  const [createNewStudents, setCreateNewStudents] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lookup = useMemo(
    () => buildLookup(halaqat, students, enrollments, progressRecords),
    [enrollments, halaqat, progressRecords, students],
  );

  const preview = useMemo(
    () => evaluateRows(state.rows, lookup, createNewStudents),
    [createNewStudents, lookup, state.rows],
  );

  const summary = useMemo(() => buildSummary(preview), [preview]);
  const readyRows = preview.filter((item) => item.canSave).map((item) => item.row);
  const blockingRows = preview.filter((item) => item.severity === "blocked");
  const reviewRows = preview.filter((item) => item.severity === "review");
  const canSave =
    readyRows.length > 0 &&
    state.errors.length === 0 &&
    blockingRows.length === 0 &&
    !isPending;

  async function handleFile(file?: File) {
    setResult("");
    setCreateNewStudents(false);
    if (!file) {
      setState((current) => ({ ...current, fileName: "" }));
      return;
    }
    try {
      const parsed =
        file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")
          ? await parseWorkbook(file)
          : parseCsv(await file.text());
      setState({ ...parsed, fileName: file.name });
    } catch {
      setState({
        rows: [],
        errors: ["تعذر قراءة الملف. تأكد أنه ملف جدول أو ملف بيانات صالح."],
        warnings: [],
        fileName: file.name,
      });
    }
  }

  function saveRows() {
    startTransition(async () => {
      setResult("");
      const response = await importStudentProgressRows(readyRows, { createNewStudents });
      if (response.ok) {
        setResult(
          `تم حفظ ${response.savedCount} صف. طلاب جدد: ${response.createdStudents}، روابط حلقات جديدة: ${response.linkedEnrollments}.`,
        );
        setState((current) => ({ ...current, warnings: response.warnings }));
      } else {
        setState((current) => ({ ...current, errors: response.errors }));
      }
    });
  }

  return (
    <section className="space-y-5">
      <div className="formal-report-shell rounded-[1.7rem] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold)]">استيراد جاهز من ملف الجداول</p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">
              استيراد الطلاب والمنجزات
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
              نزّل الملف بصيغة ملف جدول أو ملف بيانات، ثم ارفعه هنا. المعاينة ستوضح الصفوف الجاهزة والصفوف التي تحتاج مراجعة قبل الحفظ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-5 text-sm font-semibold text-[var(--primary-dark)]"
            >
              <Download aria-hidden className="size-5" />
              تنزيل قالب ملف البيانات
            </button>
            <label className="gold-button inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
              <UploadCloud aria-hidden className="size-5" />
              اختيار ملف
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-[var(--muted)]">
          {state.fileName ? `الملف المختار: ${state.fileName}` : "لم يتم اختيار ملف بعد"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
        <section className="app-card rounded-[1.5rem] p-5">
          <div className="flex items-center gap-3">
            <FileSpreadsheet aria-hidden className="size-6 text-[var(--gold)]" />
            <div>
              <h2 className="text-lg font-bold text-[var(--primary-dark)]">شكل الملف المتوقع</h2>
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                تظهر الأعمدة هنا بالعربية، ويقبل النظام العناوين العربية أو الإنجليزية.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TEMPLATE_FIELDS.map((column) => (
              <div key={column} className="rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 py-2">
                <p className="text-sm font-semibold text-[var(--primary-dark)]">{FIELD_LABELS[column]}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-xs font-bold leading-6 text-[var(--muted)]">
            يمكن استخدام القالب العربي مباشرة، كما يقبل النظام ملفات قديمة بعناوين داخلية دون عرضها في الواجهة.
          </p>
        </section>

        <section className="app-card rounded-[1.5rem] p-5">
          <h2 className="text-lg font-bold text-[var(--primary-dark)]">الحلقات المتاحة للمطابقة</h2>
          <div className="mt-4 max-h-72 space-y-2 overflow-auto pe-1">
            {halaqat.map((halaqa) => (
              <div key={halaqa.id} className="rounded-xl border border-[var(--line)] bg-[#fffdf8] p-3">
                <p className="text-sm font-semibold text-[var(--primary-dark)]">{halaqa.name}</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                  {halaqa.teacherName || "معلم غير محدد"} · {halaqa.mosqueName || "مسجد غير محدد"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Messages errors={state.errors} warnings={state.warnings} result={result} />

      <section className="app-card rounded-[1.6rem] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold)]">ملخص المعاينة</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
              {state.rows.length ? `${state.rows.length} صف مقروء` : "لم يتم رفع ملف بعد"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadErrorReport(preview)}
              disabled={preview.length === 0 || preview.every((item) => item.severity === "ready")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download aria-hidden className="size-4" />
              تحميل تقرير الأخطاء
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={saveRows}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary-dark)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? "جار الحفظ..." : "حفظ المنجزات"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="الصفوف المقروءة" value={summary.total} />
          <SummaryCard label="طلاب موجودون" value={summary.existingStudents} />
          <SummaryCard label="طلاب جدد" value={summary.newStudents} />
          <SummaryCard label="جاهزة للحفظ" value={summary.ready} />
          <SummaryCard label="تحتاج مراجعة" value={summary.review} />
          <SummaryCard label="مرفوضة" value={summary.blocked} />
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold text-[var(--primary-dark)]">
          <input
            type="checkbox"
            checked={createNewStudents}
            onChange={(event) => setCreateNewStudents(event.target.checked)}
            className="mt-1"
          />
          <span>
            إنشاء الطلاب الجدد بعد المراجعة
            <span className="mt-1 block text-xs text-[var(--muted)]">
              إذا لم تختر هذا الخيار، تبقى صفوف الطلاب الجدد في حالة مراجعة ولا تُحفظ.
            </span>
          </span>
        </label>

        {blockingRows.length > 0 ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            توجد أخطاء مانعة. حمّل تقرير الأخطاء وعدّل الملف أو المطابقة قبل الحفظ.
          </p>
        ) : null}
        {reviewRows.length > 0 && createNewStudents ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            سيتم إنشاء الطلاب الجدد المحددين كطلاب نشطين وربطهم بحلقاتهم عند الحفظ.
          </p>
        ) : null}
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="border-b border-[var(--line)] p-5">
          <p className="text-sm font-semibold text-[var(--gold)]">المعاينة قبل الحفظ</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
            {preview.length ? `${preview.length} صف في المعاينة` : "لم يتم رفع ملف بعد"}
          </h2>
        </div>
        {preview.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-[var(--muted)]">ارفع ملفًا لعرض المعاينة هنا.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="formal-table w-full min-w-[1280px] text-right text-sm">
              <thead>
                <tr>
                  {[
                    "السطر",
                    "الحالة",
                    "الطالب",
                    "الحلقة",
                    "المعلم",
                    "المستوى",
                    "آخر حفظ",
                    "آخر مراجعة",
                    "الأوجه",
                    "تاريخ المنجز",
                    "الملاحظة",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 120).map((item, index) => (
                  <tr key={`${item.row.student_name}-${item.row.halaqa_name}-${item.rowNumber}-${index}`}>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">{item.rowNumber}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(item.severity)}`}>
                        {item.label}
                      </span>
                      {item.reason ? <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.reason}</p> : null}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--primary-dark)]">{item.row.student_name || "—"}</td>
                    <td className="px-4 py-4">{item.row.halaqa_name || "—"}</td>
                    <td className="px-4 py-4">{item.row.teacher_name || "حسب الحلقة"}</td>
                    <td className="px-4 py-4">{item.row.level || "غير محدد"}</td>
                    <td className="px-4 py-4">{formatPosition(item.row.memorization_surah_name, item.row.memorization_from_ayah, item.row.memorization_to_ayah)}</td>
                    <td className="px-4 py-4">{formatPosition(item.row.review_surah_name, item.row.review_from_ayah, item.row.review_to_ayah)}</td>
                    <td className="px-4 py-4">{item.row.memorization_pages || "0"} / {item.row.review_pages || "0"}</td>
                    <td className="px-4 py-4">{item.row.progress_date || "اليوم"}</td>
                    <td className="px-4 py-4">{item.suggestion || item.row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 120 ? (
              <p className="border-t border-[var(--line)] p-4 text-center text-sm font-bold text-[var(--muted)]">
                تعرض المعاينة أول 120 صفًا فقط. سيتم حفظ كل الصفوف الجاهزة.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}

function Messages({ errors, warnings, result }: { errors: string[]; warnings: string[]; result: string }) {
  return (
    <div className="space-y-3">
      {result ? (
        <p className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <CheckCircle2 aria-hidden className="mt-0.5 size-5" />
          {result}
        </p>
      ) : null}
      {errors.map((error) => (
        <p key={error} className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle aria-hidden className="mt-0.5 size-5" />
          {error}
        </p>
      ))}
      {warnings.map((warning) => (
        <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {warning}
        </p>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

async function parseWorkbook(file: File) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [] as StudentProgressImportRow[], errors: ["لا توجد ورقة عمل داخل الملف."], warnings: [] as string[] };
  }
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map(formatCell);
  const bodyRows: string[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    bodyRows.push((row.values as unknown[]).slice(1).map(formatCell));
  });
  return mapRows(headers, bodyRows);
}

function parseCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { rows: [] as StudentProgressImportRow[], errors: ["الملف لا يحتوي على بيانات."], warnings: [] as string[] };
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const bodyRows = lines.slice(1).map(splitCsvLine);
  return mapRows(headers, bodyRows);
}

function mapRows(headers: string[], bodyRows: string[][]) {
  const mappedHeaders = headers.map((header) => HEADER_ALIASES[header] ?? HEADER_ALIASES[normalizeHeader(header)] ?? null);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!mappedHeaders.includes("student_name")) errors.push("عمود اسم الطالب مطلوب.");
  if (!mappedHeaders.includes("halaqa_name")) errors.push("عمود الحلقة مطلوب.");
  const unknownHeaders = headers.filter((header, index) => !mappedHeaders[index] && header);
  if (unknownHeaders.length > 0) warnings.push(`أعمدة لم تُستخدم في الاستيراد: ${unknownHeaders.join("، ")}`);

  const rows = bodyRows
    .map((cells) => {
      const row: StudentProgressImportRow = { student_name: "", halaqa_name: "" };
      mappedHeaders.forEach((key, index) => {
        if (key) row[key] = String(cells[index] ?? "").trim();
      });
      return normalizeClientRow(row);
    })
    .filter((row) => Object.values(row).some(Boolean));

  return { rows, errors, warnings };
}

function buildLookup(
  halaqat: HalaqaOption[],
  students: StudentOption[],
  enrollments: EnrollmentOption[],
  progressRecords: ProgressRecordOption[],
) {
  const halaqaByName = new Map(halaqat.map((halaqa) => [normalizeKey(halaqa.name), halaqa]));
  const studentByName = new Map(students.map((student) => [normalizeKey(student.fullName), student]));
  const enrollmentByStudentAndHalaqa = new Map(
    enrollments.map((enrollment) => [joinKey(enrollment.studentName, enrollment.halaqaId), enrollment]),
  );
  const progressByStudentAndHalaqa = new Map(
    progressRecords.map((record) => [`${record.studentId}::${record.halaqaId}`, record]),
  );
  return { halaqaByName, studentByName, enrollmentByStudentAndHalaqa, progressByStudentAndHalaqa, halaqat };
}

function evaluateRows(
  rows: StudentProgressImportRow[],
  lookup: ReturnType<typeof buildLookup>,
  createNewStudents: boolean,
) {
  const seen = new Set<string>();
  return rows.map((row, index): PreviewRow => {
    const rowNumber = index + 2;
    if (!row.student_name || !row.halaqa_name) {
      return preview(row, rowNumber, "missing_data", "ناقص بيانات", "blocked", "اسم الطالب والحلقة مطلوبان.", "", false);
    }

    const halaqa = lookup.halaqaByName.get(normalizeKey(row.halaqa_name));
    if (!halaqa) {
      return preview(
        row,
        rowNumber,
        "missing_halaqa",
        "الحلقة غير موجودة",
        "blocked",
        "لا توجد حلقة مطابقة في النظام.",
        closestHalaqa(row.halaqa_name, lookup.halaqat),
        false,
      );
    }

    if (row.teacher_name && halaqa.teacherName && normalizeKey(row.teacher_name) !== normalizeKey(halaqa.teacherName)) {
      return preview(
        row,
        rowNumber,
        "teacher_mismatch",
        "المعلم غير مطابق",
        "blocked",
        `المعلم في النظام: ${halaqa.teacherName}`,
        "راجع اسم المعلم أو الحلقة في الملف.",
        false,
      );
    }

    const rowSignature = duplicateSignature(row, halaqa.id);
    if (seen.has(rowSignature)) {
      return preview(row, rowNumber, "duplicate", "مكرر", "blocked", "يوجد صف مطابق داخل الملف نفسه.", "احذف الصف المكرر أو راجعه.", false);
    }
    seen.add(rowSignature);

    const enrollment = lookup.enrollmentByStudentAndHalaqa.get(joinKey(row.student_name, halaqa.id));
    const existingStudent = lookup.studentByName.get(normalizeKey(row.student_name));
    const studentId = enrollment?.studentId ?? existingStudent?.id ?? "";
    const existingProgress = studentId ? lookup.progressByStudentAndHalaqa.get(`${studentId}::${halaqa.id}`) : null;

    if (!studentId && !createNewStudents) {
      return preview(
        row,
        rowNumber,
        "new_student",
        "طالب جديد يحتاج إنشاء",
        "review",
        "الطالب غير موجود بنفس الاسم في النظام.",
        "فعّل خيار إنشاء الطلاب الجدد بعد المراجعة إذا كان الاسم صحيحًا.",
        false,
      );
    }

    if (!studentId && createNewStudents) {
      return preview(row, rowNumber, "new_student", "طالب جديد يحتاج إنشاء", "ready", "سيتم إنشاء الطالب وربطه بالحلقة عند الحفظ.", "", true);
    }

    if (existingProgress && matchesExistingProgress(row, existingProgress)) {
      return preview(
        row,
        rowNumber,
        "existing_progress_update",
        "يوجد منجز سابق مطابق",
        "ready",
        "سيتم تحديث السجل الموجود بدل إنشاء سجل جديد.",
        "",
        true,
      );
    }

    return preview(
      row,
      rowNumber,
      enrollment ? "existing_update" : "needs_review",
      enrollment ? "طالب موجود وسيتم تحديث منجزه" : "يحتاج مراجعة",
      "ready",
      enrollment ? "لن يتم تكرار الطالب." : "الطالب موجود بالاسم وسيتم ربطه بهذه الحلقة عند الحفظ.",
      "",
      true,
    );
  });
}

function buildSummary(rows: PreviewRow[]) {
  return {
    total: rows.length,
    existingStudents: rows.filter((row) => ["existing_update", "existing_progress_update"].includes(row.status)).length,
    newStudents: rows.filter((row) => row.status === "new_student").length,
    ready: rows.filter((row) => row.canSave).length,
    review: rows.filter((row) => row.severity === "review").length,
    blocked: rows.filter((row) => row.severity === "blocked").length,
  };
}

function preview(
  row: StudentProgressImportRow,
  rowNumber: number,
  status: PreviewStatus,
  label: string,
  severity: "ready" | "review" | "blocked",
  reason: string,
  suggestion: string,
  canSave: boolean,
): PreviewRow {
  return { row, rowNumber, status, label, severity, reason, suggestion, canSave };
}

function downloadTemplate() {
  const csv = toCsv([TEMPLATE_FIELDS.map((field) => FIELD_LABELS[field])]);
  downloadFile("قالب-استيراد-منجزات-الطلاب.csv", csv);
}

function downloadErrorReport(rows: PreviewRow[]) {
  const reportRows = rows
    .filter((row) => row.severity !== "ready")
    .map((row) => [
      String(row.rowNumber),
      row.row.student_name,
      row.row.halaqa_name,
      row.reason || row.label,
      row.suggestion,
    ]);
  const csv = toCsv([["رقم الصف", "اسم الطالب", "الحلقة", "سبب الخطأ", "الاقتراح"], ...reportRows]);
  downloadFile("تقرير-أخطاء-استيراد-منجزات-الطلاب.csv", csv);
}

function downloadFile(fileName: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

function normalizeClientRow(row: StudentProgressImportRow): StudentProgressImportRow {
  return {
    student_name: text(row.student_name),
    halaqa_name: text(row.halaqa_name),
    teacher_name: text(row.teacher_name),
    mosque_name: text(row.mosque_name),
    level: text(row.level),
    memorization_surah_name: stripSurahPrefix(text(row.memorization_surah_name)),
    memorization_from_ayah: text(row.memorization_from_ayah),
    memorization_to_ayah: text(row.memorization_to_ayah),
    review_surah_name: stripSurahPrefix(text(row.review_surah_name)),
    review_from_ayah: text(row.review_from_ayah),
    review_to_ayah: text(row.review_to_ayah),
    memorization_pages: text(row.memorization_pages),
    review_pages: text(row.review_pages),
    progress_date: normalizeDateText(row.progress_date),
    notes: text(row.notes),
  };
}

function matchesExistingProgress(row: StudentProgressImportRow, record: ProgressRecordOption) {
  return (
    normalizeDateText(row.progress_date) === record.progressDate &&
    normalizeKey(row.memorization_surah_name ?? "") === normalizeKey(record.memorizationSurahName) &&
    text(row.memorization_from_ayah) === text(record.memorizationFromAyah) &&
    text(row.memorization_to_ayah) === text(record.memorizationToAyah) &&
    normalizeKey(row.review_surah_name ?? "") === normalizeKey(record.reviewSurahName) &&
    text(row.review_from_ayah) === text(record.reviewFromAyah) &&
    text(row.review_to_ayah) === text(record.reviewToAyah)
  );
}

function duplicateSignature(row: StudentProgressImportRow, halaqaId: string) {
  return [
    normalizeKey(row.student_name),
    halaqaId,
    normalizeDateText(row.progress_date) || "اليوم",
    normalizeKey(row.memorization_surah_name ?? ""),
    text(row.memorization_from_ayah),
    text(row.memorization_to_ayah),
    normalizeKey(row.review_surah_name ?? ""),
    text(row.review_from_ayah),
    text(row.review_to_ayah),
  ].join("::");
}

function closestHalaqa(value: string, halaqat: HalaqaOption[]) {
  const key = normalizeKey(value);
  const candidate = halaqat.find((halaqa) => normalizeKey(halaqa.name).includes(key) || key.includes(normalizeKey(halaqa.name)));
  return candidate ? `أقرب اقتراح: ${candidate.name}` : "";
}

function statusClass(severity: PreviewRow["severity"]) {
  if (severity === "ready") return "bg-emerald-50 text-emerald-700";
  if (severity === "review") return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-700";
}

function formatPosition(surah?: string, from?: string, to?: string) {
  if (!surah) return "غير محدد";
  const range = [from, to].filter(Boolean).join(" - ");
  return range ? `${surah} (${range})` : surah;
}

function formatCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "text" in value) return text((value as { text?: unknown }).text);
  if (typeof value === "object" && value && "result" in value) return text((value as { result?: unknown }).result);
  return text(value);
}

function normalizeHeader(value: string) {
  return normalizeKey(value).replace(/\s+/g, "_");
}

function normalizeDateText(value?: string) {
  const raw = toEnglishDigits(text(value));
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function stripSurahPrefix(value: string) {
  return value.replace(/^سورة\s+/, "").trim();
}

function normalizeKey(value: string) {
  return toEnglishDigits(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toEnglishDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function joinKey(studentName: string, halaqaId: string) {
  return `${normalizeKey(studentName)}::${halaqaId}`;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
