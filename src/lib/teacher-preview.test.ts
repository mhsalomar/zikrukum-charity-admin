import { describe, expect, it } from "vitest";

import { canUseTeacherPreview, isQaAccount, previewActorName } from "./teacher-preview";

describe("teacher preview authorization", () => {
  it("allows only admin and demo admin roles", () => {
    expect(canUseTeacherPreview(["admin"])).toBe(true);
    expect(canUseTeacherPreview(["demo_admin"])).toBe(true);
    expect(canUseTeacherPreview(["teacher"])).toBe(false);
    expect(canUseTeacherPreview(["supervisor"])).toBe(false);
  });

  it("recognizes the internal QA account", () => {
    expect(isQaAccount("qa@example.com")).toBe(true);
    expect(isQaAccount("admin@example.com")).toBe(false);
  });

  it("keeps the real actor visible during preview", () => {
    expect(previewActorName("qa@example.com", ["demo_admin"])).toBe("حساب تجربة QA");
    expect(previewActorName("admin@example.com", ["admin"])).toBe("الإدارة");
  });
});
