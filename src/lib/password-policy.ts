export function validatePasswordSecurity(password: string) {
  const minLength = password.length >= 10;
  const maxLength = password.length <= 128;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  let hasSequential = false;
  for (let index = 0; index < password.length - 2; index += 1) {
    const first = password.charCodeAt(index);
    const second = password.charCodeAt(index + 1);
    const third = password.charCodeAt(index + 2);
    if ([first, second, third].every(code => code >= 48 && code <= 57)
      && ((second === first + 1 && third === second + 1)
        || (second === first - 1 && third === second - 1)
        || (first === second && second === third))) {
      hasSequential = true;
      break;
    }
  }
  const hasBirthYear = /(19[4-9]\d|20[0-2]\d)/.test(password)
    || /(?:^|[^0-9])(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])(?!\d)/.test(password);
  return {
    minLength, maxLength, hasUpper, hasLower, hasNumber, hasSymbol,
    noSequential: !hasSequential,
    noBirthYear: !hasBirthYear,
    isValid: minLength && maxLength && hasUpper && hasLower && hasNumber && hasSymbol && !hasSequential && !hasBirthYear,
  };
}

export function getPasswordValidationError(password: string): string | null {
  const checks = validatePasswordSecurity(password);
  if (!checks.minLength || !checks.maxLength) return "La contraseña debe tener entre 10 y 128 caracteres.";
  if (!checks.hasUpper || !checks.hasLower) return "La contraseña debe incluir letras mayúsculas y minúsculas.";
  if (!checks.hasNumber) return "La contraseña debe incluir al menos un número.";
  if (!checks.hasSymbol) return "La contraseña debe incluir al menos un símbolo especial (!@#$%...).";
  if (!checks.noSequential) return "La contraseña no debe contener números en secuencia (ej. 123, 987, 000).";
  if (!checks.noBirthYear) return "Por seguridad no utilices años o fechas de nacimiento (ej. 1998, 2004).";
  return null;
}

export function getPasswordConfirmationError(password: string, confirmation: string): string | null {
  if (!confirmation) return "Vuelve a escribir tu contraseña para confirmarla.";
  if (password !== confirmation) return "Las contraseñas no coinciden. Revisa ambos campos.";
  return null;
}
