import { type SelectHTMLAttributes } from "react";
import { fieldBase, labelBase } from "./fieldStyles";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly string[];
  placeholder?: string;
  error?: string;
}

export default function Select({
  label,
  options,
  placeholder = "Select an option",
  error,
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div>
      <label htmlFor={selectId} className={labelBase}>
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={`${fieldBase} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10 ${className}`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.6' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
          }}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
