import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { executiveRoles } from "@/lib/module-access";
import { MemberSignatureClient } from "./MemberSignatureClient";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type PageProps = { params: Promise<{ id: string }> };

export default async function BoardMemberDetailPage({ params }: PageProps) {
  await requireAnyRole([...executiveRoles]);
  const { id } = await params;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("board_members")
    .select("id,full_name,position,phone,email,membership_start,membership_end,status,notes,signature_url")
    .eq("id", id)
    .maybeSingle();

  if (!member) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800" dir="rtl">
        لم يتم العثور على العضو.
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/board/members"
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[#075f4d]"
        >
          <ArrowRight className="size-4" aria-hidden />
          الأعضاء
        </Link>
        <h1 className="text-lg font-bold text-[#075f4d]">{member.full_name}</h1>
      </div>

      {/* Member info */}
      <section className="rounded-[1.4rem] border border-[var(--line,#e5e7eb)] bg-white p-5">
        <h2 className="mb-4 border-r-4 border-[#075f4d] pr-3 text-base font-semibold text-[#075f4d]">بيانات العضو</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {member.position && <InfoBox label="المنصب" value={member.position} />}
          {member.phone && <InfoBox label="الجوال" value={member.phone} />}
          {member.email && <InfoBox label="البريد" value={member.email} />}
          {member.membership_start && <InfoBox label="بداية العضوية" value={member.membership_start} />}
          {member.membership_end && <InfoBox label="نهاية العضوية" value={member.membership_end} />}
          <InfoBox label="الحالة" value={member.status === "active" ? "نشط" : member.status === "inactive" ? "غير نشط" : "مؤرشف"} />
        </div>
        {member.notes && (
          <div className="mt-3 rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-3">
            <p className="text-xs font-semibold text-[#667c74] mb-1">ملاحظات</p>
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}
      </section>

      {/* Signature upload */}
      <MemberSignatureClient
        memberId={member.id}
        currentSignatureUrl={member.signature_url ? `/api/board-member-signatures/${member.id}` : null}
        memberName={member.full_name}
      />
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe7dd] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#667c74]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#075f4d]">{value}</p>
    </div>
  );
}
