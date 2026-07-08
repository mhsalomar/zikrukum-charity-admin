export const teacherStatusLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "معتذر",
};

export const observedSessionTypeLabels: Record<string, string> = {
  recitation: "تسميع",
  tajweed: "تجويد",
  review: "مراجعة",
  teaching: "تلقين",
  test: "اختبار",
  activity: "نشاط",
  other: "أخرى",
};

export const achievementMatchLabels: Record<string, string> = {
  matched: "مطابق",
  not_matched: "غير مطابق",
  not_available: "غير متاح",
};

export const visitStatusLabels: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمدة",
  needs_followup: "تحتاج متابعة",
  open: "مسودة",
};

export const yesNoLabels: Record<string, string> = {
  yes: "نعم",
  no: "لا",
};

export function labelFrom(map: Record<string, string>, value: unknown, fallback = "غير محدد") {
  const key = String(value ?? "");
  return map[key] ?? fallback;
}
