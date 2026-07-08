export type StaffImportKind = "teacher" | "supervisor";

export type StaffImportRow = {
  full_name: string;
  national_id?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  iban?: string;
  document_type?: string;
  document_number?: string;
  document_expiry_date?: string;
  role_title?: string;
  status?: string;
  salary_amount?: string;
  halaqat?: string;
  notes?: string;
};

export type StaffImportStatus =
  | "matched"
  | "new"
  | "duplicate"
  | "missing_data"
  | "invalid_iban"
  | "invalid_identity"
  | "invalid_email"
  | "invalid_phone"
  | "missing_halaqa";

export type StaffImportPreviewRow = {
  rowNumber: number;
  row: StaffImportRow;
  status: StaffImportStatus;
  matchedId: string;
  message: string;
  canSave: boolean;
};

export const staffImportLabels: Record<keyof StaffImportRow, string> = {
  full_name: "الاسم الكامل",
  national_id: "رقم الهوية/الإقامة",
  phone: "الجوال",
  email: "البريد الإلكتروني",
  bank_name: "البنك",
  iban: "الآيبان",
  document_type: "نوع الوثيقة",
  document_number: "رقم الوثيقة",
  document_expiry_date: "تاريخ انتهاء الوثيقة",
  role_title: "الدور/المسمى",
  status: "الحالة",
  salary_amount: "الراتب/المكافأة",
  halaqat: "الحلقات",
  notes: "ملاحظات",
};

export const staffImportFields = Object.keys(staffImportLabels) as Array<keyof StaffImportRow>;

export const staffHeaderAliases: Record<string, keyof StaffImportRow> = {
  "الاسم الكامل": "full_name",
  "الإسم الكامل": "full_name",
  "اسم المعلم": "full_name",
  "اسم المعلمة": "full_name",
  "الاسم": "full_name",
  full_name: "full_name",
  fullName: "full_name",
  name: "full_name",
  "رقم الهوية/الإقامة": "national_id",
  "رقم الهوية": "national_id",
  "رقم الإقامة": "national_id",
  national_id: "national_id",
  "الجوال": "phone",
  "رقم الجوال": "phone",
  phone: "phone",
  "البريد الإلكتروني": "email",
  "البريد": "email",
  email: "email",
  "البنك": "bank_name",
  bank_name: "bank_name",
  "الآيبان": "iban",
  "رقم الآيبان": "iban",
  iban: "iban",
  "نوع الوثيقة": "document_type",
  document_type: "document_type",
  "رقم الوثيقة": "document_number",
  document_number: "document_number",
  "تاريخ انتهاء الوثيقة": "document_expiry_date",
  document_expiry_date: "document_expiry_date",
  "الدور/المسمى": "role_title",
  "الدور": "role_title",
  "المسمى": "role_title",
  role_title: "role_title",
  role: "role_title",
  "الحالة": "status",
  status: "status",
  "الراتب/المكافأة": "salary_amount",
  "الراتب": "salary_amount",
  "المكافأة": "salary_amount",
  salary_amount: "salary_amount",
  "الحلقات": "halaqat",
  "الحلقة": "halaqat",
  halaqat: "halaqat",
  circles: "halaqat",
  "ملاحظات": "notes",
  notes: "notes",
};

const normalizedStaffHeaderAliases = new Map(
  Object.entries(staffHeaderAliases).map(([alias, field]) => [normalizeStaffHeader(alias), field]),
);

export type StaffImportMappedRows = {
  rows: StaffImportRow[];
  readHeaders: string[];
  mappedHeaders: Array<keyof StaffImportRow | undefined>;
  errors: string[];
};

export function mapStaffImportRows(rawRows: string[][]): StaffImportMappedRows {
  const [rawHeaders = [], ...dataRows] = rawRows;
  const readHeaders = rawHeaders.map(cleanHeaderDisplay).filter(Boolean);
  const mappedHeaders = rawHeaders.map(resolveStaffImportHeader);
  const errors: string[] = [];

  if (!mappedHeaders.includes("full_name")) {
    errors.push(
      `لم يتم العثور على عمود الاسم الكامل. الأعمدة التي قرأها النظام: ${readHeaders.join("، ") || "لا توجد أعمدة"}.`,
    );
  }

  const rows = dataRows
    .map((values) => {
      const row = { full_name: "" } as StaffImportRow;
      mappedHeaders.forEach((field, index) => {
        if (field) row[field] = String(values[index] ?? "").trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));

  return { rows, readHeaders, mappedHeaders, errors };
}

export function resolveStaffImportHeader(value: string) {
  return normalizedStaffHeaderAliases.get(normalizeStaffHeader(value));
}

export function normalizeStaffHeader(value: string) {
  return normalizeKey(
    String(value ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .replace(/\s+/g, " "),
  );
}

export function normalizeStaffImportRow(row: StaffImportRow): StaffImportRow {
  const nationalId = digits(row.national_id || row.document_number);
  return {
    full_name: text(row.full_name),
    national_id: nationalId,
    phone: normalizePhone(row.phone),
    email: text(row.email).toLowerCase(),
    bank_name: text(row.bank_name),
    iban: normalizeIban(row.iban),
    document_type: normalizeDocumentType(row.document_type, nationalId),
    document_number: nationalId || text(row.document_number),
    document_expiry_date: normalizeDate(row.document_expiry_date),
    role_title: text(row.role_title),
    status: normalizeStatus(row.status),
    salary_amount: normalizeAmount(row.salary_amount),
    halaqat: text(row.halaqat),
    notes: text(row.notes),
  };
}

export function validateStaffImportRow(row: StaffImportRow) {
  if (!row.full_name) return { status: "missing_data" as const, message: "الاسم الكامل مطلوب." };
  if (row.iban && !isValidBankAccount(row.iban)) {
    return { status: "invalid_iban" as const, message: "رقم الحساب/الآيبان غير صالح. يجب أن يكون آيبان سعودي (SA + 22 رقم) أو رقم حساب بنكي (8-20 رقمًا)." };
  }
  if (row.national_id && !isValidIdentity(row.national_id)) {
    return { status: "invalid_identity" as const, message: "رقم الهوية أو الإقامة يجب أن يتكون من 10 أرقام." };
  }
  if (row.email && !isValidEmail(row.email)) {
    return { status: "invalid_email" as const, message: "صيغة البريد الإلكتروني غير صحيحة." };
  }
  if (row.phone && !isValidPhone(row.phone)) {
    return { status: "invalid_phone" as const, message: "رقم الجوال غير صحيح." };
  }
  return null;
}

export function splitHalaqat(value?: string) {
  return text(value)
    .split(/[|،,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeKey(value?: string) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isValidSaudiIban(value?: string) {
  return /^SA\d{22}$/.test(normalizeIban(value));
}

export function isValidBankAccount(value?: string) {
  const v = normalizeIban(value);
  return /^SA\d{22}$/.test(v) || /^\d{8,20}$/.test(v);
}

export function isValidIdentity(value?: string) {
  return /^\d{10}$/.test(digits(value));
}

export function isValidEmail(value?: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value).toLowerCase());
}

export function isValidPhone(value?: string) {
  const valueDigits = digits(value);
  return /^(05\d{8}|5\d{8}|9665\d{8})$/.test(valueDigits);
}

export function normalizeIban(value?: string) {
  return text(value).replace(/\s+/g, "").toUpperCase();
}

export function digits(value?: string) {
  return toEnglishDigits(text(value)).replace(/\D/g, "");
}

function normalizePhone(value?: string) {
  return text(value).replace(/[^\d+]/g, "");
}

function normalizeDocumentType(value: string | undefined, nationalId: string) {
  const key = normalizeKey(value);
  if (["هوية وطنية", "هويه وطنيه", "هوية", "national id", "national_id"].includes(key)) return "national_id";
  if (["إقامة", "اقامه", "iqama"].includes(key)) return "iqama";
  if (nationalId.startsWith("1")) return "national_id";
  if (nationalId.startsWith("2")) return "iqama";
  return key ? text(value) : "";
}

function normalizeStatus(value?: string) {
  const key = normalizeKey(value);
  if (["غير نشط", "غير نشط", "inactive", "موقوف"].includes(key)) return "inactive";
  if (["نشط", "active"].includes(key)) return "active";
  return text(value);
}

function normalizeAmount(value?: string) {
  const cleaned = toEnglishDigits(text(value)).replace(/[^\d.-]/g, "");
  return cleaned && Number.isFinite(Number(cleaned)) ? cleaned : "";
}

function normalizeDate(value?: string) {
  const raw = toEnglishDigits(text(value));
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function cleanHeaderDisplay(value: string) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ");
}
