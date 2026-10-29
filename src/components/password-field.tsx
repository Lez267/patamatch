"use client";

import { useId, useState, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  error?: string | null;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export function PasswordField({ value, onChange, label = "Contraseña", autoComplete = "current-password", minLength = 8, maxLength, placeholder, error, onBlur, inputRef }: PasswordFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-control">
        <input
          id={inputId}
          ref={inputRef}
          className="input"
          type={visible ? "text" : "password"}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          required
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          className="button secondary password-toggle"
          type="button"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label === "Confirmar contraseña" ? "confirmación de contraseña" : label.toLocaleLowerCase("es")}`}
          aria-controls={inputId}
          aria-pressed={visible}
          onClick={() => setVisible(current => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {error && <p className="error" id={errorId} aria-live="polite">{error}</p>}
    </div>
  );
}
