"use client";

import { AlertCircle, CheckCircle2, Download, Printer, Save, UploadCloud } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  importCompetitionWinnerTransfers,
  markCompetitionWinnersExported,
  type CompetitionWinnerImportRow,
} from "@/app/dashboard/programs/actions";
import { money } from "@/lib/format";
import type { Program, ProgramWinner } from "@/lib/programs";

type PreviewWinner = CompetitionWinnerImportRow & {
  rowNumber: number;
};

type ParseState = {
  fileName: string;
  rows: PreviewWinner[];
  errors: string[];
  warnings: string[];
};

const headerMap: Record<string, keyof CompetitionWinnerImportRow> = {
  "رقم الحضور": "attendance_no",
  "الاسم الرباعي": "winner_name",
  "المركز والمستوى المشارك فيه": "rank_level",
  "رقم الايبان": "iban",
  "رقم الآيبان": "iban",
  "الآيبان": "iban",
  "البنك": "bank_name",
  "المبلغ": "prize_amount",
  "الهوية أو الإقامة": "national_id",
  "الهوية او الاقامة": "national_id",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  ready: "جاهز للتحويل",
  exported: "تم التصدير",
  paid: "تم التحويل",
};

export function CompetitionWinnersTransferManager({
  program,
  winners,
  canManage,
  canViewSensitive,
}: {
  program: Program;
  winners: ProgramWinner[];
  canManage: boolean;
  canViewSensitive: boolean;
}) {
  const [state, setState] = useState<ParseState>({ fileName: "", rows: [], errors: [], warnings: [] });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const transferWinners = useMemo(
    () => winners.filter((winner) => winner.winner_name || winner.iban || winner.prize_amount !== null),
    [winners],
  );
  const existingKeys = useMemo(() => buildExistingKeys(transferWinners), [transferWinners]);
  const previewSummary = useMemo(() => summarizePreview(state.rows), [state.rows]);
  const savedSummary = useMemo(() => summarizeSaved(transferWinners), [transferWinners]);
  const previewRows = useMemo(() => state.rows.map((row) => ({
    ...row,
    status: validatePreviewRow(row, state.rows, existingKeys),
  })), [existingKeys, state.rows]);
  const hasMissingAmounts = previewRows.some((row) => row.status.includes("المبلغ غير مدخل"));
  const hasBlockingPreviewIssue = previewRows.some((row) =>
    row.status.some((status) => status !== "المبلغ غير مدخل" && status !== "موجود مسبقًا"),
  );
  const savedRowsReady = transferWinners.length > 0 && transferWinners.every(isSavedWinnerReady);

  async function handleFile(file?: File) {
    setMessage("");
    if (!file) return;
    try {
      const parsed = await parseWorkbook(file);
      setState({ ...parsed, fileName: file.name });
    } catch {
      setState({
        fileName: file.name,
        rows: [],
        errors: ["تعذر قراءة الملف. تأكد أنه ملف جدول صالح وبنفس الأعمدة المطلوبة."],
        warnings: [],
      });
    }
  }

  function updateAmount(index: number, value: string) {
    const amount = Number(value || 0);
    setState((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, prize_amount: amount > 0 ? amount : null } : row),
    }));
  }

  function saveRows(mode: "draft" | "ready") {
    startTransition(async () => {
      setMessage("");
      const response = await importCompetitionWinnerTransfers(program.id, state.rows, mode);
      if (response.ok) {
        setMessage(`تم الحفظ بنجاح. جديد: ${response.savedCount}، محدث: ${response.updatedCount}.`);
        setState((current) => ({ ...current, warnings: response.warnings }));
      } else {
        setState((current) => ({ ...current, errors: response.errors, warnings: response.warnings }));
      }
    });
  }

  async function exportTransferFile() {
    if (!savedRowsReady) return;
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("بيان التحويل", { views: [{ rightToLeft: true }] });
    worksheet.columns = [
      { header: "م", key: "index", width: 8 },
      { header: "الاسم", key: "name", width: 32 },
      { header: "الآيبان", key: "iban", width: 30 },
      { header: "البنك", key: "bank", width: 18 },
      { header: "المبلغ", key: "amount", width: 14 },
      { header: "الهوية أو الإقامة", key: "nationalId", width: 18 },
      { header: "الوصف", key: "description", width: 34 },
    ];
    transferWinners.forEach((winner, index) => {
      worksheet.addRow({
        index: index + 1,
        name: winner.winner_name ?? "",
        iban: winner.iban ?? "",
        bank: winner.bank_name ?? "",
        amount: Number(winner.prize_amount ?? 0),
        nationalId: winner.national_id ?? "",
        description: "جائزة مسابقة الشهيد الخامسة",
      });
    });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "بيان_تحويل_فائزي_مسابقة_الشهيد_الخامسة.xlsx";
    link.click();
    URL.revokeObjectURL(url);
    const response = await markCompetitionWinnersExported(program.id);
    setMessage(response.message);
  }

  return (
    <section className="space-y-5">
      <div className="app-card rounded-[1.6rem] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold)]">الفائزون والتحويلات</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">استيراد ملف فائزين مسابقة الشهيد الخامسة</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">
              ارفع الملف، راجع البيانات، أدخل مبالغ الجوائز، ثم احفظ. لا يتم تجهيز ملف التحويل حتى تكتمل كل المبالغ والبيانات البنكية.
            </p>
          </div>
          {canManage ? (
            <label className="gold-button inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
              <UploadCloud aria-hidden className="size-5" />
              استيراد ملف الفائزين
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          ) : null}
        </div>
        <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3 text-sm font-bold text-[var(--muted)]">
          {state.fileName ? `الملف المختار: ${state.fileName}` : "لم يتم اختيار ملف بعد."}
        </p>
      </div>

      <Messages errors={state.errors} warnings={state.warnings} message={message} />

      {state.rows.length > 0 ? (
        <section className="app-card overflow-hidden rounded-[1.6rem]">
          <div className="grid gap-3 border-b border-[var(--line)] p-5 md:grid-cols-4">
            <Summary label="عدد الفائزين" value={previewSummary.count} />
            <Summary label="لديهم مبلغ" value={previewSummary.withAmount} />
            <Summary label="ناقصو المبلغ" value={previewSummary.missingAmount} />
            <Summary label="الإجمالي" value={money(previewSummary.total)} />
          </div>
          <div className="overflow-x-auto">
            <table className="formal-table w-full min-w-[1240px] text-right text-sm">
              <thead>
                <tr>
                  {["رقم الحضور", "الاسم", "المركز والمستوى", "الآيبان", "البنك", "الهوية أو الإقامة", "المبلغ", "حالة التحقق"].map((heading) => (
                    <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.rowNumber}-${row.winner_name}`}>
                    <td className="px-4 py-4">{row.attendance_no || "—"}</td>
                    <td className="px-4 py-4 font-semibold text-[var(--primary-dark)]">{row.winner_name || "—"}</td>
                    <td className="px-4 py-4">{row.rank_level || "—"}</td>
                    <td className="px-4 py-4 font-mono text-xs">{canViewSensitive ? row.iban : maskIban(row.iban)}</td>
                    <td className="px-4 py-4">{row.bank_name || "—"}</td>
                    <td className="px-4 py-4">{canViewSensitive ? row.national_id : maskNationalId(row.national_id)}</td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.prize_amount ?? ""}
                        onChange={(event) => updateAmount(index, event.target.value)}
                        className="h-11 w-32 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-3 text-sm font-semibold outline-none focus:border-[var(--gold)]"
                        aria-label={`مبلغ ${row.winner_name}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <StatusList values={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canManage ? (
            <div className="flex flex-col gap-3 border-t border-[var(--line)] p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isPending || hasBlockingPreviewIssue}
                onClick={() => saveRows("draft")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-5 text-sm font-semibold text-[var(--primary-dark)] disabled:opacity-45"
              >
                <Save aria-hidden className="size-5" />
                حفظ كمسودة
              </button>
              <button
                type="button"
                disabled={isPending || hasMissingAmounts || hasBlockingPreviewIssue}
                onClick={() => saveRows("ready")}
                className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white disabled:opacity-45"
              >
                جاهز للتحويل
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--gold)]">البيانات المحفوظة</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">بيان الفائزين والتحويلات</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={transferWinners.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-xs font-semibold text-[var(--primary-dark)] disabled:opacity-45"
            >
              <Printer aria-hidden className="size-4" />
              طباعة بيان الفائزين
            </button>
            {canManage ? (
              <button
                type="button"
                onClick={exportTransferFile}
                disabled={!savedRowsReady}
                className="gold-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-semibold text-white disabled:opacity-45"
              >
                <Download aria-hidden className="size-4" />
                تجهيز ملف التحويل
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 border-b border-[var(--line)] p-5 md:grid-cols-4">
          <Summary label="الفائزون المحفوظون" value={savedSummary.count} />
          <Summary label="المكتملون للتحويل" value={savedSummary.ready} />
          <Summary label="ناقصو المبلغ" value={savedSummary.missingAmount} />
          <Summary label="إجمالي الجوائز" value={money(savedSummary.total)} />
        </div>
        {hasMixedBanks(transferWinners) ? (
          <p className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            يوجد بنوك مختلفة، يرجى التأكد من صيغة التحويل المطلوبة قبل الإرسال.
          </p>
        ) : null}
        {transferWinners.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-[var(--muted)]">لا توجد بيانات فائزين محفوظة لهذه المسابقة بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="formal-table w-full min-w-[1120px] text-right text-sm">
              <thead>
                <tr>
                  {["م", "الاسم", "المركز والمستوى", "البنك", "الآيبان", "المبلغ", "حالة التحويل"].map((heading) => (
                    <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transferWinners.map((winner, index) => (
                  <tr key={winner.id}>
                    <td className="px-4 py-4">{index + 1}</td>
                    <td className="px-4 py-4 font-semibold text-[var(--primary-dark)]">{winner.winner_name ?? "—"}</td>
                    <td className="px-4 py-4">{winner.rank_level ?? "—"}</td>
                    <td className="px-4 py-4">{winner.bank_name ?? "—"}</td>
                    <td className="px-4 py-4 font-mono text-xs">{canViewSensitive ? winner.iban ?? "—" : maskIban(winner.iban)}</td>
                    <td className="px-4 py-4">{money(winner.prize_amount)}</td>
                    <td className="px-4 py-4">{statusLabels[winner.transfer_status] ?? winner.transfer_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PrintableStatement program={program} winners={transferWinners} />
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--primary-dark)]">{value}</p>
    </div>
  );
}

function Messages({ errors, warnings, message }: { errors: string[]; warnings: string[]; message: string }) {
  return (
    <div className="space-y-3">
      {message ? (
        <p className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <CheckCircle2 aria-hidden className="mt-0.5 size-5" />
          {message}
        </p>
      ) : null}
      {errors.map((error) => (
        <p key={error} className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle aria-hidden className="mt-0.5 size-5" />
          {error}
        </p>
      ))}
      {warnings.slice(0, 8).map((warning) => (
        <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {warning}
        </p>
      ))}
    </div>
  );
}

function StatusList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">سليم</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${value === "موجود مسبقًا" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>
          {value}
        </span>
      ))}
    </div>
  );
}

function PrintableStatement({ program, winners }: { program: Program; winners: ProgramWinner[] }) {
  const total = winners.reduce((sum, winner) => sum + Number(winner.prize_amount ?? 0), 0);
  return (
    <section className="hidden print:block">
      <div className="mx-auto min-h-[287mm] w-[210mm] bg-white p-[16mm] text-right text-black">
        <header className="border-b border-[#d8cfbd] pb-5">
          <p className="text-sm font-bold text-[#0b5d42]">جمعية ذكركم لتحفيظ القرآن الكريم بالعيون</p>
          <h1 className="mt-3 text-2xl font-bold">بيان أسماء الفائزين ومبلغ التحويل لمسابقة الشهيد الخامسة</h1>
          <p className="mt-2 text-sm">التاريخ: {new Date().toLocaleDateString("ar-SA")}</p>
          <p className="mt-1 text-sm">المسابقة: {program.name}</p>
        </header>
        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f4f0e6]">
              {["م", "الاسم", "المركز والمستوى", "البنك", "الآيبان", "المبلغ"].map((heading) => (
                <th key={heading} className="border border-[#d8cfbd] px-2 py-2 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {winners.map((winner, index) => (
              <tr key={winner.id}>
                <td className="border border-[#d8cfbd] px-2 py-2">{index + 1}</td>
                <td className="border border-[#d8cfbd] px-2 py-2">{winner.winner_name ?? "—"}</td>
                <td className="border border-[#d8cfbd] px-2 py-2">{winner.rank_level ?? "—"}</td>
                <td className="border border-[#d8cfbd] px-2 py-2">{winner.bank_name ?? "—"}</td>
                <td className="border border-[#d8cfbd] px-2 py-2">{maskIban(winner.iban)}</td>
                <td className="border border-[#d8cfbd] px-2 py-2">{money(winner.prize_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="border border-[#d8cfbd] px-2 py-2 font-semibold">الإجمالي</td>
              <td className="border border-[#d8cfbd] px-2 py-2 font-semibold">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
        <footer className="mt-12 grid grid-cols-2 gap-8 text-sm font-bold">
          <div>
            <p>المراجعة المالية</p>
            <div className="mt-10 border-t border-[#d8cfbd] pt-2">الاسم والتوقيع</div>
          </div>
          <div>
            <p>اعتماد الإدارة</p>
            <div className="mt-10 border-t border-[#d8cfbd] pt-2">الختم والتوقيع</div>
          </div>
        </footer>
      </div>
    </section>
  );
}

async function parseWorkbook(file: File): Promise<ParseState> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.getWorksheet("الورقة1") ?? workbook.worksheets[0];
  if (!worksheet) {
    return { fileName: file.name, rows: [], errors: ["لا توجد ورقة عمل داخل الملف."], warnings: [] };
  }

  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => normalizeHeader(String(value ?? "")));
  const mappedHeaders = headers.map((header) => headerMap[header] ?? null);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mappedHeaders.includes("winner_name")) errors.push("عمود الاسم الرباعي مطلوب.");
  if (!mappedHeaders.includes("rank_level")) errors.push("عمود المركز والمستوى مطلوب.");
  if (!mappedHeaders.includes("iban")) errors.push("عمود رقم الآيبان مطلوب.");
  if (!mappedHeaders.includes("bank_name")) errors.push("عمود البنك مطلوب.");
  if (!mappedHeaders.includes("national_id")) errors.push("عمود الهوية أو الإقامة مطلوب.");

  const rows: PreviewWinner[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1);
    const draft: CompetitionWinnerImportRow = {
      attendance_no: "",
      winner_name: "",
      rank_level: "",
      iban: "",
      bank_name: "",
      national_id: "",
      prize_amount: null,
    };
    mappedHeaders.forEach((key, index) => {
      if (!key) return;
      const value = cellToText(values[index]);
      if (key === "prize_amount") {
        draft.prize_amount = Number(value || 0) > 0 ? Number(value) : null;
      } else {
        draft[key] = value as never;
      }
    });
    const hasWinnerData = draft.winner_name || draft.rank_level || draft.iban || draft.bank_name || draft.national_id;
    if (!hasWinnerData) return;
    rows.push({
      ...draft,
      attendance_no: draft.attendance_no.replace(/\.0$/, ""),
      national_id: draft.national_id.replace(/\.0$/, ""),
      iban: normalizeIban(draft.iban),
      winner_name: draft.winner_name.trim().replace(/\s+/g, " "),
      rank_level: draft.rank_level.trim().replace(/\s+/g, " "),
      bank_name: draft.bank_name.trim(),
      rowNumber,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("لم يتم العثور على فائزين داخل الملف.");
  }

  const previewErrors = rows.flatMap((row) =>
    validatePreviewRow(row, rows, { ibans: new Set(), nationalIds: new Set(), nameRanks: new Set() })
      .filter((status) => status !== "المبلغ غير مدخل" && status !== "موجود مسبقًا")
      .map((status) => `السطر ${row.rowNumber}: ${status}`),
  );

  return {
    fileName: file.name,
    rows,
    errors: [...errors, ...previewErrors],
    warnings: rows.some((row) => !row.prize_amount) ? ["المبالغ غير مدخلة لبعض الفائزين؛ لا يمكن التصدير حتى تعبئتها."] : warnings,
  };
}

function validatePreviewRow(row: CompetitionWinnerImportRow, rows: CompetitionWinnerImportRow[], existing: ReturnType<typeof buildExistingKeys>) {
  const statuses: string[] = [];
  if (!row.winner_name) statuses.push("الاسم مطلوب");
  if (!row.rank_level) statuses.push("المركز والمستوى مطلوب");
  if (!isValidSaudiIban(row.iban)) statuses.push("الآيبان غير صحيح");
  if (!row.bank_name) statuses.push("البنك مطلوب");
  if (!row.national_id) statuses.push("الهوية أو الإقامة مطلوبة");
  if (!row.prize_amount || row.prize_amount <= 0) statuses.push("المبلغ غير مدخل");

  const ibanCount = rows.filter((item) => normalizeIban(item.iban) === normalizeIban(row.iban)).length;
  const nationalCount = rows.filter((item) => item.national_id && item.national_id === row.national_id).length;
  const nameRankCount = rows.filter((item) =>
    normalizeKey(item.winner_name) === normalizeKey(row.winner_name)
    && normalizeKey(item.rank_level) === normalizeKey(row.rank_level),
  ).length;
  if (row.iban && ibanCount > 1) statuses.push("الآيبان مكرر");
  if (row.national_id && nationalCount > 1) statuses.push("الهوية أو الإقامة مكررة");
  if (row.winner_name && row.rank_level && nameRankCount > 1) statuses.push("الاسم والمركز مكرران");

  if (
    existing.ibans.has(normalizeIban(row.iban))
    || existing.nationalIds.has(row.national_id)
    || existing.nameRanks.has(`${normalizeKey(row.winner_name)}::${normalizeKey(row.rank_level)}`)
  ) {
    statuses.push("موجود مسبقًا");
  }

  return statuses;
}

function buildExistingKeys(winners: ProgramWinner[]) {
  return {
    ibans: new Set(winners.map((winner) => normalizeIban(winner.iban ?? "")).filter(Boolean)),
    nationalIds: new Set(winners.map((winner) => winner.national_id ?? "").filter(Boolean)),
    nameRanks: new Set(winners.map((winner) => `${normalizeKey(winner.winner_name ?? "")}::${normalizeKey(winner.rank_level ?? "")}`).filter((key) => key !== "::")),
  };
}

function summarizePreview(rows: CompetitionWinnerImportRow[]) {
  const total = rows.reduce((sum, row) => sum + Number(row.prize_amount ?? 0), 0);
  return {
    count: rows.length,
    withAmount: rows.filter((row) => Number(row.prize_amount ?? 0) > 0).length,
    missingAmount: rows.filter((row) => Number(row.prize_amount ?? 0) <= 0).length,
    total,
  };
}

function summarizeSaved(rows: ProgramWinner[]) {
  const total = rows.reduce((sum, row) => sum + Number(row.prize_amount ?? 0), 0);
  return {
    count: rows.length,
    ready: rows.filter(isSavedWinnerReady).length,
    missingAmount: rows.filter((row) => Number(row.prize_amount ?? 0) <= 0).length,
    total,
  };
}

function isSavedWinnerReady(winner: ProgramWinner) {
  return Boolean(
    winner.winner_name
    && isValidSaudiIban(winner.iban ?? "")
    && winner.bank_name
    && winner.national_id
    && Number(winner.prize_amount ?? 0) > 0,
  );
}

function hasMixedBanks(rows: ProgramWinner[]) {
  return new Set(rows.map((row) => row.bank_name).filter(Boolean)).size > 1;
}

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeIban(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function isValidSaudiIban(value: string) {
  return /^SA[0-9A-Z]{22}$/.test(normalizeIban(value));
}

function normalizeKey(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function cellToText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String((value as { result?: unknown }).result ?? "").trim();
  return String(value).trim();
}

function maskIban(value: string | null | undefined) {
  const iban = normalizeIban(value);
  if (!iban) return "—";
  return `${iban.slice(0, 4)}••••••••••••••${iban.slice(-4)}`;
}

function maskNationalId(value: string | null | undefined) {
  const id = String(value ?? "").trim();
  if (!id) return "—";
  return `${id.slice(0, 2)}••••••${id.slice(-2)}`;
}
