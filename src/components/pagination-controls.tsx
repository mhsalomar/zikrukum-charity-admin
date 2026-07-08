"use client";

const pageSizeOptions = [10, 25, 50];

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageCount,
    items: items.slice(start, start + pageSize),
    start: items.length === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, items.length),
  };
}

export function PaginationControls({
  page,
  pageCount,
  pageSize,
  total,
  start,
  end,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-white/72 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-[var(--muted)]">
        عرض {start} - {end} من {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-xl border border-[var(--line)] bg-[#fffdf8] px-3 text-xs font-semibold text-[var(--primary-dark)] outline-none focus:border-[var(--gold)]"
          aria-label="عدد السجلات في الصفحة"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="min-h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          السابق
        </button>
        <span className="rounded-xl bg-[var(--gold-soft)] px-3 py-2 text-xs font-semibold text-[#765514]">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="min-h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
