export function isValidClinicPhone(value: string): boolean {
  const phone = value.trim();
  if (!phone) return true;
  const digits = phone.replace(/\D/g, "");
  return phone.length <= 30 && /^\+?[\d\s().-]+$/.test(phone) && digits.length >= 10 && digits.length <= 15;
}

export function clinicPhoneHref(value: string): string | null {
  const phone = value.trim();
  if (!phone || !isValidClinicPhone(phone)) return null;
  return `tel:${phone.startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`;
}
