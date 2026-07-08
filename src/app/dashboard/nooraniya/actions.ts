"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole, requireRole } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const nooraniyaRoles = ["admin", "demo_admin", "executive_director", "executive_manager", "halaqat_manager"] as const;

export async function addNooraniyaStudent(formData: FormData) {
  await requireAnyRole([...nooraniyaRoles]);
  const supabase = await createClient();

  const student_name = cleanText(formData.get("student_name"), 150);
  const form_name = cleanText(formData.get("form_name"), 150);
  const parent_phone = cleanText(formData.get("parent_phone"), 30);
  const group_name = cleanText(formData.get("group_name") ?? "الأولى", 100);
  const session_time = cleanText(formData.get("session_time"), 100);
  const notes = cleanText(formData.get("notes"), 2000) || null;

  if (!student_name || !form_name || !parent_phone) {
    redirect("/dashboard/nooraniya?error=missing");
  }

  const { error } = await supabase.from("nooraniya_students").insert({
    student_name,
    form_name,
    parent_phone,
    group_name,
    session_time,
    notes,
    status: "active",
  });

  if (error) redirect("/dashboard/nooraniya?error=save");

  revalidatePath("/dashboard/nooraniya");
}

export async function deleteNooraniyaStudent(id: string) {
  await requireAnyRole([...nooraniyaRoles]);
  const supabase = await createClient();
  await supabase.from("nooraniya_students").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/dashboard/nooraniya");
}

// Temporary one-time cleanup — remove after use
const KEEP_NAMES = [
  "رواف حمد القرناس","عبدالله محمد سعد المفرج","زيد فالح العساف",
  "مبارك سعد مبارك السليم","عبدالرحمن عبدالله القرناس","محمد محمود عبدالحميد",
  "هذال عبدالله سعد المفرج","عبدالله خالد السهلي","سعد نايف سعود المغيره",
  "فهد متعب جمعه العيد","صالح حمد المطيران","البراء سلطان المغيره",
  "معاذ سلطان المغيره","يوسف محمود عبدالحميد","يزن محمد سعد المفرج",
  "صالح عبدالله الدسم","هاشل محمد الهاشل","نواف محمد الهاشل",
  "يوسف عبدالله المفرج","علي حسين علي الفزيع","حمد عبدالعزيز السبيعي",
  "ريان حمد صالح الزعبي","عبدالعزيز محمد احمد الشاهين","سعود خالد الحمادي",
  "ابراهيم عمر الهزاع","سعد عمر سعد الغريب","طايل محمد احمد الشاهين",
  "ناصر متعب ناصر الغريب","نهار غازي ناصر الغريب","جمعه متعب العيد",
];

function norm(s: string) {
  return s.trim()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/عبد\s+/g, "عبد") // "عبد الله" → "عبدالله"
    .replace(/\s+/g, " ");
}

function shouldKeep(formName: string) {
  const n = norm(formName);
  const parts = n.split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  return KEEP_NAMES.some(k => {
    const kp = norm(k).split(" ");
    return kp[0] === first && kp[kp.length - 1] === last;
  });
}

export async function restoreAllArchivedNooraniya(): Promise<number> {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("nooraniya_students")
    .update({ archived_at: null })
    .not("archived_at", "is", null)
    .select("id");
  revalidatePath("/dashboard/nooraniya");
  return data?.length ?? 0;
}

export async function dryRunCleanup(): Promise<{ toArchive: string[]; toKeep: string[] }> {
  await requireAnyRole([...nooraniyaRoles]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("nooraniya_students")
    .select("id, form_name")
    .is("archived_at", null);
  if (!data) return { toArchive: [], toKeep: [] };
  return {
    toArchive: data.filter(s => !shouldKeep(s.form_name)).map(s => s.form_name),
    toKeep: data.filter(s => shouldKeep(s.form_name)).map(s => s.form_name),
  };
}

export async function cleanupNooraniyaStudents(): Promise<{ archived: string[]; kept: string[] }> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("nooraniya_students")
    .select("id, form_name")
    .is("archived_at", null);

  if (!data) return { archived: [], kept: [] };

  const toArchive = data.filter(s => !shouldKeep(s.form_name));
  const toKeep = data.filter(s => shouldKeep(s.form_name));

  if (toArchive.length > 0) {
    await supabase
      .from("nooraniya_students")
      .update({ archived_at: new Date().toISOString() })
      .in("id", toArchive.map(s => s.id));
  }

  revalidatePath("/dashboard/nooraniya");
  return {
    archived: toArchive.map(s => s.form_name),
    kept: toKeep.map(s => s.form_name),
  };
}
