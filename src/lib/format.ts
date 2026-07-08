export function money(value: number | null | undefined) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function payrollRunLabel(run: { month: string; year: number }) {
  return `${run.year}-${String(run.month).padStart(2, "0")}`;
}

export function num(value: number | null | undefined, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits }).format(Number(value ?? 0));
}
