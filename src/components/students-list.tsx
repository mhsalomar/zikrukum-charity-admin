"use client";

import Link from "next/link";
import { Pencil, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { updateStudentRecord } from "@/app/dashboard/operational-actions";
import { paginate, PaginationControls } from "@/components/pagination-controls";

export type StudentListRecord = {
  id: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  level: string;
  enrolledAt: string;
  notes: string;
  halaqaId: string;
  halaqaName: string;
  teacherName: string;
  period: string;
  mosqueName: string;
  status: string;
};

export type HalaqaEditOption = {
  value: string;
  label: string;
  teacherName: string;
  period: string;
  mosqueName: string;
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
};

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export function StudentsList({
  records,
  halaqat,
}: {
  records: StudentListRecord[];
  halaqat: HalaqaEditOption[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((record) =>
      (!status || record.status === status) &&
      (!normalized ||
        [
          record.fullName,
          record.halaqaName,
          record.teacherName,
          record.period,
          record.mosqueName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)),
    );
  }, [query, records, status]);
  const paginated = paginate(filtered, page, pageSize);

  return (
    <section className="app-card overflow-hidden rounded-[1.6rem]">
      <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">بحث الطلاب</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم الطالب أو الحلقة أو المسجد..."
            className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
          />
          <Search aria-hidden="true" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
        </label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1120px] text-right text-sm">
          <thead className="bg-[#f4f0e6] text-[#31564d]">
            <tr>
              <th className="px-5 py-3 font-semibold">اسم الطالب</th>
              <th className="px-5 py-3 font-semibold">الحلقة</th>
              <th className="px-5 py-3 font-semibold">المعلم</th>
              <th className="px-5 py-3 font-semibold">الفترة</th>
              <th className="px-5 py-3 font-semibold">المسجد</th>
              <th className="px-5 py-3 font-semibold">الحالة</th>
              <th className="px-5 py-3 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {paginated.items.map((record) => (
              <tr key={record.id} className="transition hover:bg-[#fbf6ea]">
                <td className="px-5 py-3 font-semibold text-[var(--primary-dark)]">{record.fullName}</td>
                <td className="px-5 py-3">{record.halaqaName || "غير محدد"}</td>
                <td className="px-5 py-3">{record.teacherName || "غير محدد"}</td>
                <td className="px-5 py-3"><PeriodBadge value={record.period} /></td>
                <td className="px-5 py-3">{record.mosqueName || "غير محدد"}</td>
                <td className="px-5 py-3"><StatusBadge value={record.status} /></td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-2">
                    <Link
                      href={`/dashboard/students/${record.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)]"
                    >
                      ملف الطالب
                    </Link>
                    <StudentEditModal record={record} halaqat={halaqat} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {paginated.items.map((record) => (
          <article key={record.id} className="resource-mobile-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--primary-dark)]">
                {record.fullName}
              </h2>
              <StatusBadge value={record.status} />
            </div>
            <Info label="الحلقة" value={record.halaqaName} />
            <Info label="المعلم" value={record.teacherName} />
            <Info label="الفترة" value={periodLabels[record.period] ?? record.period} />
            <Info label="المسجد" value={record.mosqueName} />
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/students/${record.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)]"
                >
                  ملف الطالب
                </Link>
                <StudentEditModal record={record} halaqat={halaqat} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="p-5 text-sm font-semibold text-[var(--muted)]">
          لا توجد سجلات مطابقة للبحث الحالي.
        </p>
      ) : (
        <PaginationControls
          page={paginated.page}
          pageCount={paginated.pageCount}
          pageSize={pageSize}
          total={filtered.length}
          start={paginated.start}
          end={paginated.end}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}

function StudentEditModal({
  record,
  halaqat,
}: {
  record: StudentListRecord;
  halaqat: HalaqaEditOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedHalaqaId, setSelectedHalaqaId] = useState(record.halaqaId);
  const selectedHalaqa = halaqat.find((halaqa) => halaqa.value === selectedHalaqaId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/45 bg-[#fff8e6] px-3 text-xs font-semibold text-[#765514] transition hover:border-[var(--gold)] hover:bg-[#f8edcf] focus:outline-none focus:ring-4 focus:ring-[var(--gold)]/20"
      >
        <Pencil aria-hidden="true" className="size-4" />
        تعديل
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
          <section className="app-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--gold)]">تعديل آمن</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
                  تعديل الطالب
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]"
                aria-label="إغلاق النموذج"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form action={updateStudentRecord} className="mt-5 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={record.id} />
              <TextField name="full_name" label="اسم الطالب" value={record.fullName} required />
              <TextField name="national_id" label="رقم الهوية" value={record.nationalId} />
              <SelectField
                name="status"
                label="الحالة"
                value={record.status}
                options={[
                  { value: "active", label: "نشط" },
                  { value: "inactive", label: "غير نشط" },
                ]}
              />
              <TextField
                name="birth_date"
                label="تاريخ الميلاد"
                value={record.birthDate}
                type="date"
              />
              <TextField
                name="guardian_name"
                label="اسم ولي الأمر"
                value={record.guardianName}
              />
              <TextField
                name="guardian_phone"
                label="جوال ولي الأمر"
                value={record.guardianPhone}
                type="tel"
              />
              <TextField name="level" label="المستوى" value={record.level} />
              <TextField name="enrolled_at" label="تاريخ الالتحاق" value={record.enrolledAt} type="date" />
              <label className="block text-sm font-bold text-[var(--text)]">
                الحلقة
                <select
                  name="halaqa_id"
                  value={selectedHalaqaId}
                  onChange={(event) => setSelectedHalaqaId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15"
                >
                  <option value="">بدون تغيير</option>
                  {halaqat.map((halaqa) => (
                    <option key={halaqa.value} value={halaqa.value}>
                      {halaqa.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 md:col-span-2">
                <p className="text-xs font-semibold text-[var(--gold)]">
                  تفاصيل الحلقة المختارة
                </p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <Preview label="المعلم" value={selectedHalaqa?.teacherName} />
                  <Preview
                    label="الفترة"
                    value={selectedHalaqa ? periodLabels[selectedHalaqa.period] : ""}
                  />
                  <Preview label="المسجد" value={selectedHalaqa?.mosqueName} />
                </div>
              </div>

              <label className="block text-sm font-bold text-[var(--text)] md:col-span-2">
                ملاحظات
                <textarea
                  name="notes"
                  defaultValue={record.notes}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15"
                />
              </label>

              <div className="md:col-span-2">
                <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--primary-light)]/20">
                  حفظ التعديل
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function TextField({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Preview({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#81928b]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--primary-dark)]">
        {value || "غير محدد"}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold text-[#81928b]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">
        {value || "غير محدد"}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const active = value === "active";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-[#e8f5ee] text-[var(--primary-dark)]" : "bg-[#f4f1eb] text-[#6b7280]"}`}>
      {statusLabels[value] ?? value}
    </span>
  );
}

function PeriodBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#d9bf7a] bg-[#fff8e6] px-3 py-1 text-xs font-semibold text-[#765514]">
      {periodLabels[value] ?? (value || "غير محدد")}
    </span>
  );
}
