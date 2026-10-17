import { type ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  /** Renders a leading dot, useful for statuses. */
  dot?: boolean;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-3)] text-[var(--ink-soft)] border-[var(--line)]",
  brand: "bg-[var(--color-brand-50)] text-[var(--brand)] border-[var(--color-brand-200)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/25",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/25",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/25",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/25",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {dot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
