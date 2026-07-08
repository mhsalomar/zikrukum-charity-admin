import Link from "next/link";
import { BookOpen, CalendarCheck, ClipboardList, GraduationCap, UserRound } from "lucide-react";

import { EmptyState, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { attendanceLabels, ratingLabels, sessionTypeLabels } from "@/lib/teacher-portal-labels";
import {
  studentRequestStatusLabels,
  studentRequestTypeLabels,
  type StudentRequestRow,
} from "@/lib/student-requests";
import type { StudentFileData } from "@/lib/student-file";

const periodLabels: Record<string, string> = {
  fajr: "الفجر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export function StudentFileView({
  data,
  backHref,
  teacherMode = false,
}: {
  data: StudentFileData;
  backHref: string;
  teacherMode?: boolean;
}) {
  const lastAttendance = data.attendance[0];
  const lastSession = data.sessions[0];
  const lastMemorization = latestProgressPosition(data, "memorization");
  const lastReview = latestProgressPosition(data, "review");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHero
        eyebrow="ملف الطالب"
        title={data.student.fullName}
        description="بيانات الطالب والمنجزات والاختبارات."
        actions={
          <>
            <Link href={backHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-5 text-sm font-semibold text-[var(--primary-dark)]">
              العودة
            </Link>
            {teacherMode ? (
              <Link href="/teacher/dashboard#teacher-recitation" className="gold-button inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white">
                تسجيل تسميع
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Mini label="الحلقة" value={data.enrollment.halaqaName || "غير مرتبط"} icon={BookOpen} />
        <Mini label="المعلم" value={data.enrollment.teacherName || "غير محدد"} icon={UserRound} />
        <Mini label="آخر حضور" value={lastAttendance ? `${attendanceLabels[lastAttendance.status] ?? lastAttendance.status} — ${formatDate(lastAttendance.date)}` : "لا يوجد"} icon={CalendarCheck} />
        <Mini label="آخر تسميع" value={lastSession ? `${formatDate(lastSession.date)} — ${(ratingLabels[lastSession.rating] ?? lastSession.rating) || "بدون تقييم"}` : "لا يوجد"} icon={GraduationCap} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="بيانات الطالب" icon={UserRound}>
          <InfoGrid
            items={[
              ["الحالة", data.student.status === "active" ? "نشط" : "غير نشط"],
              ["المستوى", data.student.level || "غير محدد"],
              ["تاريخ الالتحاق", formatDate(data.student.enrolledAt)],
              ["ولي الأمر", data.student.guardianName || "غير محدد"],
              ["جوال ولي الأمر", data.student.guardianPhone || "غير محدد"],
              ["المسجد", data.enrollment.mosqueName || "غير محدد"],
              ["الفترة", (periodLabels[data.enrollment.period] ?? data.enrollment.period) || "غير محدد"],
            ]}
          />
          {data.student.notes ? (
            <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[var(--muted)]">
              {data.student.notes}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard title="آخر منجز" icon={ClipboardList}>
          {!lastMemorization && !lastReview ? (
            <EmptyState title="لا يوجد منجز مسجل" description="ستظهر بيانات الحفظ والمراجعة عند تسجيلها من المعلم أو الاستيراد." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <ProgressBox
                title="آخر حفظ / تسميع"
                value={lastMemorization?.value || "لا يوجد"}
                meta={lastMemorization ? formatDate(lastMemorization.date) : ""}
              />
              <ProgressBox
                title="آخر مراجعة"
                value={lastReview?.value || "لا يوجد"}
                meta={lastReview ? formatDate(lastReview.date) : ""}
              />
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="سجل الحضور" icon={CalendarCheck}>
          {data.attendance.length === 0 ? (
            <EmptyState title="لا يوجد حضور مسجل" />
          ) : (
            <Timeline items={data.attendance.slice(0, 8).map((item) => ({
              title: attendanceLabels[item.status] ?? item.status,
              meta: formatDate(item.date),
              body: item.notes || "بدون ملاحظات",
            }))} />
          )}
        </SectionCard>

        <SectionCard title="سجل التسميع والمراجعة" icon={BookOpen}>
          {data.sessions.length === 0 ? (
            <EmptyState title="لا توجد جلسات مسجلة" />
          ) : (
            <Timeline items={data.sessions.slice(0, 8).map((item) => ({
              title: sessionTypeLabels[item.type] ?? item.type,
              meta: formatDate(item.date),
              body: [item.recitation ? `التسميع: ${item.recitation}` : "", item.review ? `المراجعة: ${item.review}` : "", item.notes].filter(Boolean).join(" — "),
            }))} />
          )}
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="الاختبارات" icon={GraduationCap}>
          {data.exams.length === 0 ? (
            <EmptyState title="لا توجد اختبارات مرتبطة" />
          ) : (
            <div className="grid gap-3">
              {data.exams.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--primary-dark)]">{item.title}</p>
                      <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">{formatDate(item.date)}</p>
                    </div>
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      item.resultStatus === "passed" ? "bg-emerald-50 text-emerald-700" :
                      item.resultStatus === "failed" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {examResultLabel(item.resultStatus)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <div className="rounded-xl bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold text-[var(--muted)]">الدرجة</p>
                      <p className="mt-0.5 font-semibold text-[var(--primary-dark)]">{item.score || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold text-[var(--muted)]">الأخطاء</p>
                      <p className="mt-0.5 font-semibold text-[var(--primary-dark)]">{item.mistakesCount}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold text-[var(--muted)]">التنبيهات</p>
                      <p className="mt-0.5 font-semibold text-[var(--primary-dark)]">{item.alertsCount}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold text-[var(--muted)]">الحالة</p>
                      <p className="mt-0.5 font-semibold text-[var(--primary-dark)]">
                        {item.lockedAt || item.approvedAt ? "مقفل إداريًا" : item.needsReview ? "يحتاج مراجعة" : "محفوظ"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                    خصم الأخطاء: {formatNumber(item.mistakesDiscount)} — خصم التنبيهات: {formatNumber(item.alertsDiscount)}
                  </p>
                  {item.evaluatorName ? (
                    <p className="mt-2 text-xs font-bold text-[var(--muted)]">المقيّم: {item.evaluatorName}</p>
                  ) : null}
                  {item.passage ? <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{item.passage}{item.selectedJuz.length ? ` · الأجزاء: ${item.selectedJuz.join("، ")}` : ""}</p> : null}
                  {item.recommendation ? <p className="mt-2 text-xs font-bold text-[var(--gold)]">التوصية: {item.recommendation}</p> : null}
                  {item.notes ? (
                    <p className="mt-2 rounded-xl bg-[var(--bg)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{item.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="الطلبات المرتبطة" icon={ClipboardList}>
          {data.requests.length === 0 ? (
            <EmptyState title="لا توجد طلبات مرتبطة بهذا الطالب" />
          ) : (
            <div className="grid gap-3">
              {data.requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </main>
  );
}

function examResultLabel(value: string) {
  return ({
    pending: "لم تحدد",
    passed: "ناجح",
    failed: "غير مجتاز",
    retest: "يحتاج إعادة",
  } as Record<string, string>)[value] ?? "لم تحدد";
}

function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return (
    <article className="app-card rounded-2xl p-4">
      <Icon aria-hidden className="size-5 text-[var(--gold)]" />
      <p className="mt-3 text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold leading-7 text-[var(--primary-dark)]">{value || "غير محدد"}</p>
    </article>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-3">
          <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--primary-dark)]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ProgressBox({ title, value, meta }: { title: string; value: string; meta?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <p className="text-xs font-semibold text-[var(--gold)]">{title}</p>
      <p className="mt-2 text-base font-semibold text-[var(--primary-dark)]">{value}</p>
      {meta ? <p className="mt-1 text-xs font-bold text-[var(--muted)]">{meta}</p> : null}
    </div>
  );
}

function Timeline({ items }: { items: Array<{ title: string; meta: string; body: string }> }) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <article key={`${item.title}-${item.meta}-${index}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-[var(--primary-dark)]">{item.title}</p>
            <p className="text-xs font-bold text-[var(--muted)]">{item.meta}</p>
          </div>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">{item.body || "بدون ملاحظات"}</p>
        </article>
      ))}
    </div>
  );
}

function RequestCard({ request }: { request: StudentRequestRow }) {
  const approved = request.status === "approved";
  const rejected = request.status === "rejected";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[var(--primary-dark)]">
          {studentRequestTypeLabels[request.requestType] ?? request.requestType}
        </p>
        <StatusChip tone={approved ? "success" : rejected ? "warning" : "default"}>
          {studentRequestStatusLabels[request.status] ?? request.status}
        </StatusChip>
      </div>
      <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">{request.reason || "بدون سبب مكتوب"}</p>
      {request.decisionNotes ? <p className="mt-2 text-xs font-bold text-[var(--gold)]">قرار الاعتماد: {request.decisionNotes}</p> : null}
    </article>
  );
}

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA").format(date);
}

function latestProgressPosition(data: StudentFileData, type: "memorization" | "review") {
  const candidates = [
    ...data.sessions
      .filter((item) => type === "memorization" ? Boolean(item.recitation) : Boolean(item.review))
      .map((item) => ({ date: item.date, value: type === "memorization" ? item.recitation : item.review })),
    ...data.progress
      .filter((item) => type === "memorization" ? Boolean(item.memorization) : Boolean(item.review))
      .map((item) => ({ date: item.date, value: type === "memorization" ? item.memorization : item.review })),
  ];
  return candidates.sort((a, b) => b.date.localeCompare(a.date))[0];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(value);
}
