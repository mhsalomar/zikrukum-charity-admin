"use client";

import { useMemo, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getAyahRangeText, type AyahEntry } from "@/lib/quran-ayah-action";

import { calculateExamScore } from "@/lib/exam-scoring";
import { juzOptions, passageLabel, suggestQuranPassage } from "@/lib/quran-juz";
import { quranSurahs } from "@/lib/quran-surahs";

export type ExamAssessmentDefaults = {
  selectedJuz?: number[];
  passageLength?: "short" | "medium" | "long";
  fromSurahNo?: number;
  fromAyah?: number;
  toSurahNo?: number;
  toAyah?: number;
  mistakesCount?: number;
  alertsCount?: number;
  tajweedRating?: string;
  memorizationNotes?: string;
  tajweedNotes?: string;
  generalNotes?: string;
  recommendation?: string;
  fullScore?: number;
  mistakeDeduction?: number;
  alertsDeduct?: boolean;
  alertDeduction?: number;
};

export function ExamAssessmentFields({ defaults = {} }: { defaults?: ExamAssessmentDefaults }) {
  const [selectedJuz, setSelectedJuz] = useState<number[]>(defaults.selectedJuz ?? []);
  const [length, setLength] = useState<"short" | "medium" | "long">(defaults.passageLength ?? "medium");
  const [fromSurahNo, setFromSurahNo] = useState(defaults.fromSurahNo ?? 2);
  const [toSurahNo, setToSurahNo] = useState(defaults.toSurahNo ?? defaults.fromSurahNo ?? 2);
  const [fromAyah, setFromAyah] = useState(defaults.fromAyah ?? 1);
  const [toAyah, setToAyah] = useState(defaults.toAyah ?? 10);
  const [mistakes, setMistakes] = useState(defaults.mistakesCount ?? 0);
  const [alerts, setAlerts] = useState(defaults.alertsCount ?? 0);
  const [fullScore, setFullScore] = useState(defaults.fullScore ?? 100);
  const [mistakeDeduction, setMistakeDeduction] = useState(defaults.mistakeDeduction ?? 1);
  const [alertsDeduct, setAlertsDeduct] = useState(defaults.alertsDeduct ?? true);
  const [alertDeduction, setAlertDeduction] = useState(defaults.alertDeduction ?? 0.25);
  const [ayahTexts, setAyahTexts] = useState<AyahEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      getAyahRangeText(fromSurahNo, fromAyah, toSurahNo, toAyah)
        .then((entries) => { if (!cancelled) setAyahTexts(entries); })
        .catch(() => { if (!cancelled) setAyahTexts([]); });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [fromSurahNo, fromAyah, toSurahNo, toAyah]);

  const scoring = calculateExamScore({
    fullScore,
    mistakesCount: mistakes,
    mistakeDeduction,
    alertsCount: alerts,
    alertsDeduct,
    alertDeduction,
  });
  const finalScore = scoring.finalScore;
  const rating = scoring.rating;
  const resultStatus = scoring.resultStatus;
  const fromSurah = quranSurahs.find((item) => item.number === fromSurahNo);
  const toSurah = quranSurahs.find((item) => item.number === toSurahNo);
  const currentLabel = passageLabel({
    fromSurahName: fromSurah?.name ?? "",
    fromAyah,
    toSurahName: toSurah?.name ?? "",
    toAyah,
  });

  const hidden = useMemo(() => ({
    selectedJuz: selectedJuz.join(","),
    fromSurahName: fromSurah?.name ?? "",
    toSurahName: toSurah?.name ?? "",
  }), [selectedJuz, fromSurah?.name, toSurah?.name]);

  function generate() {
    const passage = suggestQuranPassage(selectedJuz, length);
    if (!passage) return;
    setFromSurahNo(passage.fromSurahNo);
    setToSurahNo(passage.toSurahNo);
    setFromAyah(passage.fromAyah);
    setToAyah(passage.toAyah);
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="selected_juz" value={hidden.selectedJuz} />
      <input type="hidden" name="from_surah_name" value={hidden.fromSurahName} />
      <input type="hidden" name="to_surah_name" value={hidden.toSurahName} />
      <input type="hidden" name="passage_length" value={length} />
      <input type="hidden" name="calculated_score" value={finalScore} />
      <input type="hidden" name="score" value={finalScore} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="result_status" value={resultStatus} />
      <input type="hidden" name="alerts_deduct" value={alertsDeduct ? "1" : "0"} />

      <section className="rounded-2xl border border-[var(--border)] bg-[#fffdf8] p-4">
        <h3 className="font-semibold text-[var(--primary-dark)]">الأجزاء والمقطع القرآني</h3>
        <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">اختر الأجزاء ثم اقترح المقطع أو عدله.</p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {juzOptions.map((juz) => {
            const checked = selectedJuz.includes(juz);
            return (
              <button
                type="button"
                key={juz}
                onClick={() => setSelectedJuz((current) => checked ? current.filter((item) => item !== juz) : [...current, juz].sort((a, b) => a - b))}
                className={`min-h-10 rounded-xl border text-xs font-semibold ${checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--primary-dark)]"}`}
                aria-pressed={checked}
              >
                {juz}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="طول المقطع">
            <select value={length} onChange={(event) => setLength(event.target.value as typeof length)} className={inputClass}>
              <option value="short">قصير</option><option value="medium">متوسط</option><option value="long">طويل</option>
            </select>
          </Field>
          <button type="button" onClick={generate} disabled={!selectedJuz.length} className="gold-button inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="size-4" /> اقتراح مقطع للاختبار
          </button>
        </div>
        {!selectedJuz.length ? <p className="mt-3 text-xs font-bold text-amber-700">اختر جزءًا واحدًا على الأقل لتوليد مقطع.</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SurahField name="from_surah_no" label="من سورة" value={fromSurahNo} onChange={setFromSurahNo} />
          <NumberField name="from_ayah" label="من آية" value={fromAyah} onChange={setFromAyah} max={fromSurah?.ayahCount} />
          <SurahField name="to_surah_no" label="إلى سورة" value={toSurahNo} onChange={setToSurahNo} />
          <NumberField name="to_ayah" label="إلى آية" value={toAyah} onChange={setToAyah} max={toSurah?.ayahCount} />
        </div>
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{currentLabel || "لم يحدد المقطع بعد"}</p>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-[#f6fbf8] p-4">
          <p className="mb-2 text-xs font-semibold text-emerald-900">آيات الاختبار</p>
          {ayahTexts.length === 0 ? <p className="text-xs text-[var(--muted)]">حدد السورة والآيات أعلاه لعرض النص.</p> : (
            <p
              dir="rtl"
              className="text-right font-['Amiri',serif] text-[1.25rem] leading-[2.4] text-[var(--primary-dark)]"
            >
              {ayahTexts.map(({ surahNo, ayahNo, text }) => (
                <span key={`${surahNo}:${ayahNo}`}>
                  {text}
                  <span className="mx-1 text-[0.85rem] text-emerald-700">﴿{ayahNo}﴾</span>
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
        <h3 className="font-semibold text-[var(--primary-dark)]">التقييم والدرجة</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NumberField name="mistakes_count" label="عدد الأخطاء" value={mistakes} onChange={setMistakes} />
          <NumberField name="alerts_count" label="عدد التنبيهات" value={alerts} onChange={setAlerts} />
          <Field label="تقييم التجويد">
            <select name="tajweed_rating" defaultValue={defaults.tajweedRating ?? ""} className={inputClass}>
              <option value="">بدون تقييم</option><option value="excellent">ممتاز</option><option value="very_good">جيد جدًا</option><option value="good">جيد</option><option value="needs_followup">يحتاج متابعة</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NumberField name="full_score" label="الدرجة الكاملة" value={fullScore} onChange={setFullScore} step="0.25" />
          <NumberField name="mistake_deduction" label="خصم الخطأ الواحد" value={mistakeDeduction} onChange={setMistakeDeduction} step="0.25" />
          <NumberField name="alert_deduction" label="خصم التنبيه الواحد" value={alertDeduction} onChange={setAlertDeduction} step="0.25" />
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)]">
          <input type="checkbox" checked={alertsDeduct} onChange={(event) => setAlertsDeduct(event.target.checked)} className="size-4 accent-[var(--primary)]" />
          احتساب خصم التنبيهات
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Score label="الدرجة الكاملة" value={fullScore} />
          <Score label="خصم الأخطاء" value={scoring.mistakesDiscount} />
          <Score label="خصم التنبيهات" value={alertsDeduct ? scoring.alertsDiscount : "لا يخصم"} />
          <Score label="الدرجة النهائية" value={finalScore} emphasis />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextArea name="memorization_notes" label="ملاحظات الحفظ" value={defaults.memorizationNotes} />
          <TextArea name="tajweed_notes" label="ملاحظات التجويد" value={defaults.tajweedNotes} />
          <TextArea name="general_notes" label="ملاحظات عامة" value={defaults.generalNotes} />
          <TextArea name="recommendation" label="التوصية" value={defaults.recommendation} />
        </div>
      </section>
    </div>
  );
}

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-semibold text-[var(--primary-dark)]">{label}{children}</label>; }
function SurahField({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (value: number) => void }) { return <Field label={label}><select name={name} value={value} onChange={(event) => onChange(Number(event.target.value))} className={inputClass}>{quranSurahs.map((surah) => <option key={surah.number} value={surah.number}>{surah.name}</option>)}</select></Field>; }
function NumberField({ name, label, value, onChange, max, step = "1" }: { name: string; label: string; value: number; onChange: (value: number) => void; max?: number; step?: string }) { return <Field label={label}><input name={name} type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} className={inputClass} /></Field>; }
function TextArea({ name, label, value }: { name: string; label: string; value?: string }) { return <Field label={label}><textarea name={name} defaultValue={value ?? ""} rows={3} className={`${inputClass} py-3`} /></Field>; }
function Score({ label, value, emphasis = false }: { label: string; value: string | number; emphasis?: boolean }) { return <div className={`rounded-xl p-3 text-center ${emphasis ? "bg-[var(--primary)] text-white" : "bg-[var(--bg)] text-[var(--primary-dark)]"}`}><p className="text-[10px] font-bold opacity-80">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
