type Row = Record<string, unknown>;

export function SimpleAdminTable({
  title,
  eyebrow,
  description,
  columns,
  rows,
  loadError,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Row[];
  loadError?: string;
}) {
  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">{description}</p> : null}
        </div>
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        {loadError ? (
          <Empty title="تعذر تحميل البيانات" description="تحقق من صلاحياتك أو تواصل مع مدير النظام." />
        ) : rows.length === 0 ? (
          <Empty title="لا توجد بيانات محفوظة" description="القسم جاهز لاستقبال البيانات الفعلية عند توفرها." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-[#f4f0e6] text-[#31564d]">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-5 py-4 font-semibold">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="hover:bg-[#fbf6ea]">
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4 font-bold text-[var(--text)]">
                        {formatValue(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{description}</p>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat("ar-SA").format(new Date(value));
  }
  const labels: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    archived: "مؤرشف",
    draft: "مسودة",
    approved: "معتمد",
    rejected: "مرفوض",
    expired: "منتهي",
    assigned: "مسلمة",
    returned: "مسترجعة",
  };
  return labels[String(value)] ?? String(value);
}
