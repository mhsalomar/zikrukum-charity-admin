import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import NooraniaCenter, { type NooraniStudent } from "@/components/nooraniya-center";
import { addNooraniyaStudent, cleanupNooraniyaStudents, deleteNooraniyaStudent, dryRunCleanup, restoreAllArchivedNooraniya } from "./actions";

const nooraniyaRoles = ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] as const;

export default async function NooraniyaPage() {
  await requireAnyRole([...nooraniyaRoles]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nooraniya_students")
    .select("id,student_name,form_name,parent_phone,group_name,session_time,notes,status")
    .is("archived_at", null)
    .eq("status", "active")
    .order("group_name")
    .order("student_name");

  const students: NooraniStudent[] = error ? [] : (data ?? []) as unknown as NooraniStudent[];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="p-6">
          <p className="text-sm font-semibold text-[var(--gold-soft)]">دورة نور البيان</p>
          <h1 className="mt-1 text-3xl font-bold text-white">مركز النورانية</h1>
          <p className="mt-2 text-sm leading-7 text-[#d9eee5]">
            إدارة طلاب الدورة وإرسال الإشعارات عبر واتساب بصيغة قابلة للتخصيص.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          تعذر تحميل البيانات. تحقق من صلاحياتك أو تواصل مع مدير النظام لإكمال التهيئة.
        </div>
      )}

      <NooraniaCenter
        students={students}
        onAdd={addNooraniyaStudent}
        onDelete={deleteNooraniyaStudent}
        onCleanup={cleanupNooraniyaStudents}
        onRestore={restoreAllArchivedNooraniya}
        onDryRun={dryRunCleanup}
      />
    </div>
  );
}
