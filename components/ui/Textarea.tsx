import { type TextareaHTMLAttributes } from "react";
import { fieldBase, labelBase } from "./fieldStyles";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export default function Textarea({
  label,
  error,
  id,
  className = "",
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div>
      <label htmlFor={textareaId} className={labelBase}>
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`${fieldBase} resize-y leading-relaxed ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm font-medium text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
