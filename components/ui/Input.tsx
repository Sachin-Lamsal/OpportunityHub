import { type InputHTMLAttributes } from "react";
import { errorBase, fieldBase, labelBase } from "./fieldStyles";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Optional helper text rendered under the field. */
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className={labelBase}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldBase} ${error ? "border-[var(--color-danger)]" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className={errorBase}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}
