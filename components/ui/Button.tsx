import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
  secondary:
    "bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-500",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const baseClasses =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: undefined;
  children: ReactNode;
}

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  title?: string;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = cn(
    baseClasses,
    variantClasses[variant ?? "primary"],
    sizeClasses[size ?? "md"],
    className,
  );

  if (href) {
    const { title: linkTitle } = props as LinkButtonProps;
    return (
      <Link href={href} className={classes} title={linkTitle}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props as ButtonProps;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
