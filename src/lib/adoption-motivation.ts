export const MIN_MOTIVATION_WORDS = 30;
export const MAX_MOTIVATION_CHARACTERS = 2000;

export function countMotivationWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function getMotivationError(value: string): string | null {
  if (countMotivationWords(value) < MIN_MOTIVATION_WORDS) return `Escribe al menos ${MIN_MOTIVATION_WORDS} palabras sobre el hogar que puedes ofrecer.`;
  if (value.trim().length > MAX_MOTIVATION_CHARACTERS) return `Usa como máximo ${MAX_MOTIVATION_CHARACTERS} caracteres.`;
  return null;
}
