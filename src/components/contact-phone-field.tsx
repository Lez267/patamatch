"use client";

import { useId, useState } from "react";
import { getContactPhoneError } from "@/lib/contact-phone";

export function ContactPhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = getContactPhoneError(value);
  const invalid = touched && error !== null;
  return <label className="field contact-phone-field" htmlFor={id}>
    Teléfono de contacto
    <input id={id} className="input" type="tel" inputMode="numeric" autoComplete="tel-national" required pattern="[0-9]{10}" maxLength={16} placeholder="10 dígitos, sin +52" value={value} aria-invalid={invalid} aria-describedby={`${id}-help`} onInvalid={() => setTouched(true)} onBlur={() => setTouched(true)} onChange={event => { setTouched(true); onChange(event.target.value.replace(/\D/g, "")); }} />
    <span id={`${id}-help`} className={`helper ${invalid ? "error" : ""}`} aria-live="polite">{invalid ? error : error === null ? "Teléfono válido: 10 dígitos." : "Escribe 10 dígitos, sin espacios ni lada internacional."}</span>
  </label>;
}
