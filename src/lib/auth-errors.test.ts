import { describe, expect, it } from "vitest";

import { getArabicAuthError } from "./auth-errors";

describe("getArabicAuthError", () => {
  it("returns a clear Arabic message for invalid credentials", () => {
    expect(getArabicAuthError("Invalid login credentials")).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    );
  });

  it("returns a safe generic Arabic message for unknown errors", () => {
    expect(getArabicAuthError("Unexpected service error")).toBe(
      "تعذر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل.",
    );
  });
});
