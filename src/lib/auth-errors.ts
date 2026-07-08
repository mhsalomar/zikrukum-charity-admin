const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Email not confirmed": "يرجى تأكيد البريد الإلكتروني قبل تسجيل الدخول.",
};

export function getArabicAuthError(message?: string | null) {
  if (!message) {
    return "تعذر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل.";
  }

  return (
    AUTH_ERROR_MESSAGES[message] ??
    "تعذر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل."
  );
}
