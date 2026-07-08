import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Megaphone,
  Newspaper,
  PenLine,
  Tags,
} from "lucide-react";

import { PageHero, QuickActionLink, SectionCard } from "@/components/dashboard-ui";
import { HorizontalBarChart, KpiCard } from "@/components/report-charts";
import {
  mediaStatusLabels,
  mediaTypeLabels,
  type MediaWorkspaceData,
  type MediaWorkspacePost,
} from "@/lib/media-workspace";

export function MediaWorkspace({
  data,
  basePath,
  title,
  eyebrow,
  description,
  showCategories = false,
}: {
  data: MediaWorkspaceData;
  basePath: "/media" | "/dashboard/media";
  title: string;
  eyebrow: string;
  description: string;
  showCategories?: boolean;
}) {
  const postsPath = `${basePath}/posts`;
  const coveragePath = basePath === "/media" ? "/media/coverage" : "/dashboard/media/posts";
  const categoriesPath = `${basePath}/categories`;
  const notificationsPath = basePath === "/media" ? "/media/notifications" : "/dashboard/notifications";
  const trend = [data.draft, data.ready, data.approved, data.published].some(Boolean)
    ? [data.draft, data.ready, data.approved, data.published]
    : undefined;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <Link href={postsPath} className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white">
              سجل المواد
              <PenLine aria-hidden className="size-4" />
            </Link>
            <Link href={coveragePath} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]">
              التغطيات
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="كل المواد" value={data.total} icon={Newspaper} trend={trend} />
        <KpiCard label="مسودات" value={data.draft} icon={PenLine} tone="gold" trend={trend} />
        <KpiCard label="جاهزة للمراجعة" value={data.ready} icon={Clock3} tone={data.ready > 0 ? "warning" : "sage"} trend={trend} />
        <KpiCard label="منشورة داخليًا" value={data.published} icon={CheckCircle2} tone="sage" trend={trend} />
        <KpiCard label="مجدولة قريبًا" value={data.upcoming} icon={CalendarCheck} tone="emerald" trend={trend} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickActionLink href={postsPath} icon={PenLine} label="كتابة خبر أو إعلان" color="gold" />
        <QuickActionLink href={coveragePath} icon={Megaphone} label="إضافة تغطية" color="emerald" />
        {showCategories ? <QuickActionLink href={categoriesPath} icon={Tags} label="تنظيم التصنيفات" color="sage" /> : null}
        <QuickActionLink href={notificationsPath} icon={FileText} label="إشعارات الإعلام" color="default" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="مسار النشر اليومي"
          description="ابدأ بالمسودات، ثم جهّز المواد للمراجعة، ولا تعتبر المادة منشورة إلا بعد اعتمادها."
          icon={Megaphone}
        >
          <div className="grid gap-3 md:grid-cols-4">
            <Stage label="مسودة" value={data.draft} href={`${postsPath}?status=draft`} />
            <Stage label="جاهز للمراجعة" value={data.ready} href={`${postsPath}?status=ready_for_review`} tone="warning" />
            <Stage label="معتمد" value={data.approved} href={`${postsPath}?status=approved`} tone="success" />
            <Stage label="منشور داخليًا" value={data.published} href={`${postsPath}?status=published`} tone="success" />
          </div>
          {data.missingSummary > 0 ? (
            <Link href={postsPath} className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              مواد تحتاج ملخصًا قبل المراجعة
              <span className="rounded-full bg-white px-3 py-1">{data.missingSummary}</span>
            </Link>
          ) : null}
        </SectionCard>

        <HorizontalBarChart
          title="أنواع المحتوى"
          description="توزيع المواد حسب النوع حتى يظهر الخلل في التغطيات أو الأخبار."
          data={data.typeBreakdown}
          source="المصدر: مواد المركز الإعلامي"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <QueueCard
          title="جاهز للمراجعة"
          emptyText="لا توجد مواد جاهزة للمراجعة حاليًا."
          posts={data.readyQueue}
          basePath={postsPath}
        />
        <QueueCard
          title="مسودات تحتاج إكمال"
          emptyText="لا توجد مسودات مفتوحة حاليًا."
          posts={data.drafts}
          basePath={postsPath}
        />
        <QueueCard
          title="تقويم النشر المقترح"
          emptyText="لا توجد مواد مجدولة قريبًا."
          posts={data.publishCalendar}
          basePath={postsPath}
          usePublishDate
        />
      </section>

      <SectionCard title="آخر المواد الإعلامية" icon={Newspaper}>
        {data.recent.length === 0 ? (
          <Empty text="لا توجد مواد إعلامية محفوظة بعد. ابدأ بإضافة أول خبر أو تغطية من زر إضافة مادة." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.recent.map((post) => (
              <PostCard key={post.id} post={post} href={`${postsPath}/${post.id}`} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Stage({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warning" | "success";
}) {
  const classes = {
    default: "border-[#e4dccb] bg-[#fffdf8] text-[var(--primary-dark)]",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${classes}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-3xl font-bold">{new Intl.NumberFormat("ar-SA").format(value)}</p>
    </Link>
  );
}

function QueueCard({
  title,
  emptyText,
  posts,
  basePath,
  usePublishDate = false,
}: {
  title: string;
  emptyText: string;
  posts: MediaWorkspacePost[];
  basePath: string;
  usePublishDate?: boolean;
}) {
  return (
    <section className="app-card rounded-[var(--radius)] p-5">
      <h2 className="text-lg font-bold text-[var(--primary-dark)]">{title}</h2>
      <div className="mt-4 grid gap-3">
        {posts.length === 0 ? (
          <Empty text={emptyText} compact />
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`${basePath}/${post.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 transition hover:border-[var(--gold)]">
              <p className="line-clamp-1 text-sm font-semibold text-[var(--primary-dark)]">{post.title}</p>
              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                {mediaTypeLabels[post.contentType] ?? "غير مصنف"}
                {" · "}
                {usePublishDate ? formatDate(post.proposedPublishDate) : mediaStatusLabels[post.status] ?? "غير محدد"}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function PostCard({ post, href }: { post: MediaWorkspacePost; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-4 transition hover:border-[var(--gold)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
          {mediaStatusLabels[post.status] ?? "غير محدد"}
        </span>
        <span className="rounded-full bg-[#fff4d9] px-3 py-1 text-xs font-semibold text-[#765514]">
          {mediaTypeLabels[post.contentType] ?? "غير مصنف"}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-[var(--primary-dark)]">{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-[var(--muted)]">
        {post.summary || "لا يوجد ملخص بعد."}
      </p>
      <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--gold)]">
        فتح التفاصيل
        <ArrowLeft aria-hidden className="size-3.5" />
      </span>
    </Link>
  );
}

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <p className={`rounded-2xl border border-dashed border-[var(--line)] bg-[#fffdf8] text-center text-sm font-bold leading-7 text-[var(--muted)] ${compact ? "p-4" : "p-5"}`}>
      {text}
    </p>
  );
}

function formatDate(value: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA").format(date);
}
