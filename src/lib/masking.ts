export function maskDocument(value: string | null | undefined) {
  return maskTail(value, 2);
}

export function maskIban(value: string | null | undefined) {
  return maskTail(value, 4);
}

function maskTail(value: string | null | undefined, visibleTail: number) {
  const text = String(value ?? "").replace(/\s+/g, "").trim();
  if (!text) return "غير محدد";
  if (text.length <= visibleTail) return "*".repeat(text.length);
  return `${"*".repeat(Math.max(4, text.length - visibleTail))}${text.slice(-visibleTail)}`;
}
