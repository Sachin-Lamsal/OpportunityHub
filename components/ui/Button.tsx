"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg " +
  "font-medium transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-55";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand)] text-white shadow-xs hover:bg-[var(--brand-hover)] active:scale-[0.99] " +
    "focus-visible:outline-brand-600",
  secondary:
    "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-3)] hover:border-[var(--line-strong)] " +
    "shadow-xs focus-visible:outline-[var(--line-strong)] active:scale-[0.99]",
  outline:
    "border border-[var(--line-strong)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)] " +
    "focus-visible:outline-[var(--line-strong)] active:scale-[0.99]",
  ghost:
    "bg-transparent text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] " +
    "focus-visible:outline-[var(--line-strong)]",
  danger:
    "bg-[var(--color-danger)] text-white shadow-xs hover:brightness-105 active:scale-[0.99] " +
    "focus-visible:outline-[var(--color-danger)]",
  success:
    "bg-[var(--color-success)] text-white shadow-xs hover:brightness-105 active:scale-[0.99] " +
    "focus-visible:outline-[var(--color-success)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Optional leading glyph. */
  icon?: ReactNode;
  /** Optional trailing glyph. */
  trailingIcon?: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | "href"> & {
    href?: undefined;
    loading?: boolean;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  loading?: undefined;
  title?: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90"
    />
  );
}

/**
 * The one button in the system. Supports:
 *  - variants: primary, secondary, outline, ghost, danger, success
 *  - sizes:    xs, sm, md, lg
 *  - loading   (spinner + aria-busy, never a layout shift)
 *  - as a <Link> when `href` is supplied
 */
const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className,
      children,
      icon,
      trailingIcon,
      loading,
      ...props
    },
    ref,
  ) {
    const classes = cx(base, variantClasses[variant], sizeClasses[size], className);

    if ("href" in props && props.href) {
      const { href, title } = props as ButtonAsLink;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          title={title}
          className={classes}
        >
          {icon}
          {children}
          {trailingIcon}
        </Link>
      );
    }

    const { type = "button", disabled, ...rest } = props as ButtonAsButton;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classes}
        {...rest}
      >
        {loading ? <Spinner /> : icon}
        {children}
        {!loading && trailingIcon}
      </button>
    );
  },
);

export default Button;