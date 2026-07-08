"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { EditRecordModal } from "@/components/edit-record-modal";
import { paginate, PaginationControls } from "@/components/pagination-controls";
import type { ResourceConfig, ResourceRecord } from "@/lib/operational-resources";

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

export function ResourceList({
  config,
  records,
}: {
  config: ResourceConfig;
  records: ResourceRecord[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const values = Object.values(record)
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || values.includes(normalizedQuery);
      const matchesStatus = !status || record.status === status;
      const matchesPeriod = !period || record.period === period;

      return matchesQuery && matchesStatus && matchesPeriod;
    });
  }, [period, query, records, status]);
  const paginated = paginate(filteredRecords, page, pageSize);

  function resetPage() {
    setPage(1);
  }

  return (
    <section className="app-card overflow-hidden rounded-[1.6rem]">
      <div className="grid gap-3 border-b border-[var(--line)] bg-white/72 p-4 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <span className="sr-only">بحث</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder={`ابحث في ${config.title}...`}
            className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 pl-11 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--gold)]">
            <Search aria-hidden="true" className="size-5" />
          </span>
        </label>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            resetPage();
          }}
          className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>

        {config.name === "halaqat" ? (
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              resetPage();
            }}
            className="h-12 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-bold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/15"
          >
            <option value="">كل الفترات</option>
            <option value="fajr">الفجر</option>
            <option value="asr">العصر</option>
            <option value="maghrib">المغرب</option>
            <option value="isha">العشاء</option>
          </select>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--primary-dark)]">
          السجلات الحالية
        </h2>
        <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-semibold text-[#7a5b16]">
          {filteredRecords.length} من {records.length}
        </span>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] text-right text-sm">
          <thead className="bg-[#f4f0e6] text-[#31564d]">
            <tr>
              {config.columns.map((column) => (
                <th key={column.key} className="px-5 py-4 font-semibold">
                  {column.label}
                </th>
              ))}
              <th className="px-5 py-4 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {paginated.items.map((record) => (
              <tr key={record.id} className="transition hover:bg-[#fbf6ea]">
                {config.columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 text-[#475467]">
                    {renderCell(column.key, record[column.key])}
                  </td>
                ))}
                <td className="px-5 py-4">
                  <EditRecordModal
                    config={config}
                    fields={config.fields}
                    record={record}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {paginated.items.map((record) => (
          <article key={record.id} className="resource-mobile-card p-4">
            {config.columns.map((column) => (
              <div key={column.key} className="py-2">
                <p className="text-xs font-bold text-[#81928b]">{column.label}</p>
                <div className="mt-1 break-words text-sm font-semibold text-[var(--text)]">
                  {renderCell(column.key, record[column.key])}
                </div>
              </div>
            ))}
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <EditRecordModal
                config={config}
                fields={config.fields}
                record={record}
              />
            </div>
          </article>
        ))}
      </div>

      {filteredRecords.length === 0 ? (
        <p className="p-5 text-sm font-semibold text-[var(--muted)]">
          لا توجد سجلات مطابقة للبحث الحالي.
        </p>
      ) : (
        <PaginationControls
          page={paginated.page}
          pageCount={paginated.pageCount}
          pageSize={pageSize}
          total={filteredRecords.length}
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

function renderCell(key: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return <span className="text-[#98a69f]">غير محدد</span>;
  }

  if (key === "status") {
    return <StatusBadge value={value} />;
  }

  if (key === "period") {
    return <PeriodBadge value={value} />;
  }

  if (key === "sponsor_name") {
    return <SponsorBadge value={value} />;
  }

  return statusLabels[value] ?? periodLabels[value] ?? value;
}

function StatusBadge({ value }: { value: string }) {
  const active = value === "active";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-[#e8f5ee] text-[var(--primary-dark)]"
          : "bg-[#f4f1eb] text-[#6b7280]"
      }`}
    >
      <span
        className={`size-2 rounded-full ${
          active ? "bg-[var(--primary)]" : "bg-[#9ca3af]"
        }`}
      />
      {statusLabels[value] ?? value}
    </span>
  );
}

function PeriodBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#d9bf7a] bg-[#fff8e6] px-3 py-1 text-xs font-semibold text-[#765514]">
      {periodLabels[value] ?? value}
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
