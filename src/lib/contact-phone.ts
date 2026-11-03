export function getContactPhoneError(value: string): string | null {
  if (!value) return "Escribe un teléfono de 10 dígitos.";
  if (!/^\d+$/.test(value)) return "Usa únicamente números, sin lada internacional.";
  if (value.length < 10) return value.length === 9 ? "Falta 1 dígito; el teléfono debe tener 10." : `Faltan ${10 - value.length} dígitos; el teléfono debe tener 10.`;
  if (value.length > 10) return "El teléfono debe tener exactamente 10 dígitos, sin lada internacional.";
  return null;
}
