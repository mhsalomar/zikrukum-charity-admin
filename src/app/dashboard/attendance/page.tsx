import { requireAnyRole } from "@/lib/auth";
import { operationalRoles } from "@/lib/operational-resources";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ halaqa?: string; from?: string; to?: string }>;

export default async function AttendanceReportPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAnyRole([...operationalRoles]);
  const params = await searchParams;

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const from = params.from || thirtyDaysAgo;
  const to = params.to || today;

  const supabase = await createClient();

  const { data: records } = await supabase
    .from("attendance")
    .select("student_id,status,session_date,halaqa_id,students!attendance_student_id_fkey(full_name),halaqat!attendance_halaqa_id_fkey(name)")
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: false });

  type Row = { student_id: string; status: string; session_date: string; halaqa_id: string; students: { full_name: string } | null; halaqat: { name: string } | null };
  const rows = (records ?? []) as unknown as Row[];

  // إحصاء الحالات
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of rows) {
    if (r.status in counts) counts[r.status as keyof typeof counts]++;
  }
  const total = rows.length;

  const statusLabels: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
  const statusColors: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-800",
    absent: "bg-red-100 text-red-700",
    late: "bg-amber-100 text-amber-800",
    excused: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="mb-1 text-sm font-semibold text-[var(--gold)]">إدارة الحلقات</p>
          <h1 className="text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">تقارير الحضور</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            سجل الحضور والغياب لكل الحلقات خلال الفترة المحددة.
          </p>
        </div>
      </section>

      {/* خيارات التصفية */}
      <form method="GET" className="app-card rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">من تاريخ</span>
            <input type="date" name="from" defaultValue={from} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold focus:outline-none focus:border-[var(--primary)]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">إلى تاريخ</span>
            <input type="date" name="to" defaultValue={to} max={today} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold focus:outline-none focus:border-[var(--primary)]" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-semibold text-white">عرض</button>
          </div>
        </div>
      </form>

      {/* إحصاء سريع */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["present","absent","late","excused"] as const).map((s) => (
          <div key={s} className="app-card rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-[var(--muted)]">{statusLabels[s]}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary-dark)]">{counts[s]}</p>
            {total > 0 && <p className="text-xs font-bold text-[var(--muted)]">{Math.round(counts[s] / total * 100)}%</p>}
          </div>
        ))}
      </div>

      {/* الجدول */}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-8 text-center text-sm font-bold text-[var(--muted)]">
          لا توجد سجلات حضور في هذه الفترة.
        </p>
      ) : (
        <div className="app-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الطالب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الحلقة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--surface)]">
                    <td className="px-4 py-3 font-bold text-[var(--primary-dark)]">{r.session_date}</td>
                    <td className="px-4 py-3 font-bold text-[var(--primary-dark)]">{r.students?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{r.halaqat?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusColors[r.status] ?? "bg-[var(--bg-sunken)] text-[var(--ink-2)]"}`}>
                        {statusLabels[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && (
            <p className="border-t border-[var(--line)] px-4 py-3 text-xs font-bold text-[var(--muted)]">
              يُعرض أحدث 200 سجل من أصل {rows.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
