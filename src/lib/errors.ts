const errorMap: Record<string, string> = {
  // Auth
  "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "Email not confirmed": "يرجى تأكيد البريد الإلكتروني أولاً",
  "JWT expired": "انتهت الجلسة، يرجى تسجيل الدخول من جديد",
  "invalid_grant": "بيانات الدخول منتهية، سجّل دخولك مرة أخرى",
  // Database
  "duplicate key": "هذا السجل موجود مسبقاً",
  "duplicate key value": "هذا السجل موجود مسبقاً",
  "violates foreign key": "لا يمكن الحذف — هذا السجل مرتبط ببيانات أخرى",
  "violates not-null": "حقل مطلوب غير مكتمل",
  "value too long": "النص أطول من المسموح به",
  // Network
  "Failed to fetch": "تعذّر الاتصال، تحقق من الإنترنت وحاول مجدداً",
  "network error": "خطأ في الاتصال، حاول مجدداً",
  // Generic Supabase
  "Row not found": "السجل غير موجود",
  "permission denied": "ليس لديك صلاحية تنفيذ هذا الإجراء",
  "insufficient_privilege": "ليس لديك صلاحية تنفيذ هذا الإجراء",
};

export function mapError(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "خطأ غير معروف";

  for (const [key, arabic] of Object.entries(errorMap)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return arabic;
  }

  return "حدث خطأ، حاول مجدداً أو تواصل مع الإدارة";
}
