import { describe, expect, it } from "vitest";

import {
  isValidIdentity,
  isValidPhone,
  isValidSaudiIban,
  mapStaffImportRows,
  normalizeStaffHeader,
  normalizeStaffImportRow,
  resolveStaffImportHeader,
  splitHalaqat,
  validateStaffImportRow,
} from "./staff-import";

describe("staff import validation", () => {
  it("accepts valid Saudi identifiers and normalizes values", () => {
    const row = normalizeStaffImportRow({
      full_name: " معلم تجريبي ",
      national_id: "١٢٣٤٥٦٧٨٩٠",
      iban: "SA0000000000000000000000",
      phone: "050 000 0000",
      email: "TEST@EXAMPLE.COM",
    });

    expect(row.full_name).toBe("معلم تجريبي");
    expect(row.national_id).toBe("1234567890");
    expect(row.email).toBe("test@example.com");
    expect(isValidIdentity(row.national_id)).toBe(true);
    expect(isValidPhone(row.phone)).toBe(true);
    expect(isValidSaudiIban(row.iban)).toBe(true);
  });

  it("rejects invalid IBAN before saving", () => {
    const row = normalizeStaffImportRow({ full_name: "معلم", iban: "SA123" });
    expect(validateStaffImportRow(row)?.status).toBe("invalid_iban");
  });

  it("splits multiple circle names", () => {
    expect(splitHalaqat("حلقة أولى | حلقة ثانية، حلقة ثالثة")).toEqual([
      "حلقة أولى",
      "حلقة ثانية",
      "حلقة ثالثة",
    ]);
  });

  it("maps Arabic full-name headers with BOM, quotes, spacing, and aliases", () => {
    for (const header of [
      "\uFEFFالاسم الكامل",
      ' " الاسم   الكامل " ',
      "الإسم الكامل",
      "اسم المعلم",
      "full_name",
      "fullName",
      "name",
    ]) {
      expect(resolveStaffImportHeader(header)).toBe("full_name");
    }
    expect(normalizeStaffHeader("\uFEFF  الاسم   الكامل  ")).toBe("الاسم الكامل");
  });

  it("reads unquoted Arabic CSV-shaped rows and preserves names", () => {
    const result = mapStaffImportRows([
      ["\uFEFFالاسم الكامل", "البريد الإلكتروني", "الحلقات"],
      ["رحاب يوسف مبارك السبيعي", "teacher@example.com", "جامع الأمير سلطان"],
      ["سارة عمر محمد السبيعي", "", "مزنة الحميدان"],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.full_name)).toEqual([
      "رحاب يوسف مبارك السبيعي",
      "سارة عمر محمد السبيعي",
    ]);
  });

  it("reports the headers actually read when the name column is missing", () => {
    const result = mapStaffImportRows([
      ["الجوال", "البريد الإلكتروني"],
      ["0500000000", "teacher@example.com"],
    ]);

    expect(result.errors[0]).toContain("الجوال، البريد الإلكتروني");
  });
});
