import Link from "next/link";
import { FileCheck2, Printer, ShieldCheck, UsersRound } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function BoardPage() {
  await requireAnyRole([...executiveRoles]);
  const data = await getBoardSummary();

  return (
    <div className="space-y-5">
      <section className="dashboard-hero luxury-pattern overflow-hidden rounded-[1.8rem] text-white">
        <div className="relative p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">مجلس الإدارة</p>
          <h1 className="mt-2 text-3xl font-bold">الاجتماعات والقرارات الرسمية</h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#d9eee5]">
            واجهة رسمية لمتابعة أعضاء المجلس، قرارات المجلس، ومحاضر الاجتماعات الجاهزة للطباعة.
          </p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="أعضاء المجلس" value={data.members} icon={UsersRound} />
        <Card title="قرارات المجلس" value={data.decisions} icon={FileCheck2} />
        <Card title="اجتماعات مجلس الإدارة" value={data.boardMeetings} icon={ShieldCheck} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Quick href="/dashboard/board/meetings" title="اجتماعات المجلس" />
        <Quick href="/dashboard/meetings" title="كل الاجتماعات" />
        <Quick href="/dashboard/governance" title="الحوكمة" />
      </section>
    </div>
  );
}

async function getBoardSummary() {
  const supabase = await createClient();
  const [members, decisions, meetings] = await Promise.all([
    supabase.from("board_members").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("board_decisions").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("meeting_type", "board").is("archived_at", null),
  ]);
  return { members: members.count ?? 0, decisions: decisions.count ?? 0, boardMeetings: meetings.count ?? 0 };
}

function Card({ title, value, icon: Icon }: { title: string; value: number; icon: typeof UsersRound }) {
  return <div className="app-card rounded-[1.5rem] p-5"><Icon aria-hidden className="size-6 text-[var(--gold)]" /><p className="mt-3 text-sm font-bold text-[var(--muted)]">{title}</p><p className="mt-2 text-3xl font-bold text-[var(--primary-dark)]">{value}</p></div>;
}

function Quick({ href, title, description }: { href: string; title: string; description?: string }) {
  return <Link href={href} className="app-card rounded-[1.5rem] p-5 transition hover:border-[var(--gold)]"><Printer aria-hidden className="size-5 text-[var(--gold)]" /><h2 className="mt-3 text-lg font-bold text-[var(--primary-dark)]">{title}</h2><p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{description}</p></Link>;
}
