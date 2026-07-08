import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="formal-report-shell overflow-hidden rounded-[var(--radius)]">
      <div className={`relative border-r-4 border-[var(--gold)] bg-[radial-gradient(circle_at_100%_0%,rgba(181,138,58,0.06),transparent_18rem)] ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
        <p className="text-sm font-semibold text-[var(--gold)]">{eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold leading-tight text-[var(--primary-dark)] sm:text-2xl lg:text-3xl">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--muted)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="app-card rounded-[var(--radius)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--primary-dark)]">{title}</h2>
          {description ? <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {Icon ? (
            <span className="grid size-11 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--gold-soft)] text-[var(--gold)]">
              <Icon aria-hidden className="size-5" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="section-divider my-5" aria-hidden />
      {children}
    </section>
  );
}

export function SummaryAside({
  title,
  description,
  items,
  actions,
}: {
  title: string;
  description?: string;
  items: Array<{ label: string; value: string | number; tone?: "default" | "warning" | "success" }>;
  actions?: ReactNode;
}) {
  return (
    <aside className="app-card h-fit rounded-[var(--radius)] p-5 xl:sticky xl:top-6">
      <p className="text-sm font-semibold text-[var(--gold)]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">{description}</p> : null}
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-[var(--radius-sm)] border px-4 py-3 ${toneClass(item.tone)}`}>
            <p className="text-xs font-bold opacity-80">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">{formatValue(item.value)}</p>
          </div>
        ))}
      </div>
      {actions ? <div className="mt-5 grid gap-2">{actions}</div> : null}
    </aside>
  );
}

export function QuickLinksGrid({
  links,
  columns = "xl:grid-cols-4",
}: {
  links: Array<{ href: string; title: string; description: string; icon?: LucideIcon }>;
  columns?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${columns}`}>
      {links.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="app-card group rounded-[var(--radius)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start gap-3">
              {Icon ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--gold-soft)] text-[var(--primary-dark)]">
                  <Icon aria-hidden className="size-5" />
                </span>
              ) : null}
              <div>
                <h3 className="text-lg font-bold text-[var(--primary-dark)]">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted)]">{item.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ActivityList({
  items,
  emptyText,
}: {
  items: Array<{ title: string; subtitle: string; meta?: string }>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg-elev)] p-5 text-center text-sm font-bold leading-7 text-[var(--muted)]">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={`${item.title}-${item.subtitle}-${item.meta ?? ""}`} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)] p-4">
          <p className="text-base font-semibold text-[var(--primary-dark)]">{item.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">{item.subtitle}</p>
          {item.meta ? <p className="mt-2 text-xs font-bold text-[#8b9892]">{item.meta}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function PrimaryAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="gold-button inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] px-5 text-sm font-semibold text-white">
      {children}
    </Link>
  );
}

export function SecondaryAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-elev)] px-5 text-sm font-semibold text-[var(--primary-dark)]">
      {children}
    </Link>
  );
}

export function QuickActionLink({ href, icon: Icon, label, color = "gold" }: { href: string; icon: LucideIcon; label: string; color?: "gold" | "emerald" | "sage" | "default" }) {
  const bg = { gold: "bg-[var(--soft-gold)] text-[#765514]", emerald: "bg-[var(--soft-green)] text-[var(--primary)]", sage: "bg-[#f0f6f2] text-[#3d6b58]", default: "bg-[#f5f5f5] text-[#374151]" }[color];
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[var(--shadow-md)]">
      <span className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] ${bg} transition group-hover:scale-110`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-[var(--primary-dark)]">{label}</span>
    </Link>
  );
}

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <article className={`app-card rounded-[var(--radius)] p-5 ${toneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-bold">{formatValue(value)}</p>
        </div>
        {Icon ? (
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-current/15 bg-white/55">
            <Icon aria-hidden className="size-5" />
          </span>
        ) : null}
      </div>
      {description ? <p className="mt-3 text-sm font-semibold leading-6 opacity-80">{description}</p> : null}
    </article>
  );
}

export function ChartCard({
  title,
  description,
  children,
  empty,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  empty?: boolean;
}) {
  return (
    <SectionCard title={title} description={description}>
      {empty ? <EmptyState title="لا توجد بيانات كافية لعرض الرسم" description="ستظهر المؤشرات عند توفر بيانات فعلية." /> : children}
    </SectionCard>
  );
}

export function TableCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description} action={action}>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elev)]">
        {children}
      </div>
    </SectionCard>
  );
}

export function FormCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <SectionCard title={title} description={description}>
      <div className="grid gap-5">{children}</div>
    </SectionCard>
  );
}

export function AlertCard({
  title,
  description,
  tone = "warning",
}: {
  title: string;
  description?: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div className={`rounded-[var(--radius)] border p-4 ${toneClass(tone)}`}>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold leading-7 opacity-80">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-sunken)]/50 px-6 py-10 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--gold)] shadow-[var(--shadow-sm)] ring-4 ring-[var(--gold-soft)]">
        <Icon aria-hidden className="size-7" strokeWidth={1.8} />
      </span>
      <p className="text-base font-semibold text-[var(--primary-dark)]">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm font-semibold leading-7 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function StatusChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--shadow-inset-hi)] ${toneClass(tone)}`}>{children}</span>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="app-card flex flex-wrap items-end gap-3 rounded-[var(--radius)] p-4">{children}</div>;
}

function toneClass(tone: "default" | "warning" | "success" = "default") {
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-[var(--primary-dark)]";
  return "border-[var(--line)] bg-[#fffdf8] text-[var(--primary-dark)]";
}

function formatValue(value: string | number) {
  return typeof value === "number" ? new Intl.NumberFormat("ar-SA").format(value) : value;
}
