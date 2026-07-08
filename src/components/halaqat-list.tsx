"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EditRecordModal } from "@/components/edit-record-modal";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import type { FieldConfig, ResourceConfig } from "@/lib/operational-resources";

export type HalaqaListRecord = {
  id: string;
  name: string;
  mosque_id: string;
  teacher_id: string;
  supervisor_id: string;
  sponsor_name: string;
  teacherName: string;
  period: string;
  mosqueName: string;
  sponsorName: string;
  studentCount: number;
  status: string;
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

export function HalaqatList({
  config,
  fields,
  records,
}: {
  config: ResourceConfig;
  fields: FieldConfig[];
  records: HalaqaListRecord[];
}) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesPeriod = !period || record.period === period;
      const matchesStatus = !status || record.status === status;
      const matchesQuery =
        !normalized ||
        [
          record.name,
          record.teacherName,
          record.mosqueName,
          record.sponsorName,
          record.period,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesPeriod && matchesStatus && matchesQuery;
    });
  }, [period, query, records, status]);
  const paginated = paginate(filtered, page, pageSize);

  return (
    <section className="app-card overflow-hidden rounded-[1.6rem]">
      <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <span className="sr-only">بحث الحلقات</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم الحلقة أو المعلم أو المسجد..."
            className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
          />
          <Search aria-hidden="true" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
        </label>
        <select
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value);
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
        >
          <option value="">كل الفترات</option>
          <option value="fajr">الفجر</option>
          <option value="asr">العصر</option>
          <option value="maghrib">المغرب</option>
          <option value="isha">العشاء</option>
        </select>
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
        <table className="w-full min-w-[980px] text-right text-sm">
          <thead className="bg-[#f4f0e6] text-[#31564d]">
            <tr>
              <th className="px-5 py-4 font-semibold">اسم الحلقة</th>
              <th className="px-5 py-4 font-semibold">المعلم</th>
              <th className="px-5 py-4 font-semibold">الفترة</th>
              <th className="px-5 py-4 font-semibold">المسجد</th>
              <th className="px-5 py-4 font-semibold">الداعم / الكفيل</th>
              <th className="px-5 py-4 font-semibold">عدد الطلاب</th>
              <th className="px-5 py-4 font-semibold">الحالة</th>
              <th className="px-5 py-4 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {paginated.items.map((record) => (
              <tr key={record.id} className="transition hover:bg-[#fbf6ea]">
                <td className="px-5 py-4 font-semibold text-[var(--primary-dark)]">{record.name}</td>
                <td className="px-5 py-4">{record.teacherName || "غير محدد"}</td>
                <td className="px-5 py-4"><PeriodBadge value={record.period} /></td>
                <td className="px-5 py-4">{record.mosqueName || "غير محدد"}</td>
                <td className="px-5 py-4">{record.sponsorName ? <SponsorBadge value={record.sponsorName} /> : "غير محدد"}</td>
                <td className="px-5 py-4 font-semibold">{record.studentCount}</td>
                <td className="px-5 py-4"><StatusBadge value={record.status} /></td>
                <td className="px-5 py-4">
                  <EditRecordModal config={config} fields={fields} record={record} />
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
                {record.name}
              </h2>
              <StatusBadge value={record.status} />
            </div>
            <Info label="المعلم" value={record.teacherName} />
            <Info label="الفترة" value={periodLabels[record.period] ?? record.period} />
            <Info label="المسجد" value={record.mosqueName} />
            <Info label="الداعم / الكفيل" value={record.sponsorName} />
            <Info label="عدد الطلاب" value={String(record.studentCount)} />
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <EditRecordModal config={config} fields={fields} record={record} />
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="p-5 text-sm font-semibold text-[var(--muted)]">
          لا توجد حلقات مطابقة للبحث الحالي.
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

function SponsorBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#f8edcf] px-3 py-1 text-xs font-semibold text-[#7a5b16]">
      {value}
    </span>
  );
}
