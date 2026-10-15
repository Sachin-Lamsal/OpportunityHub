import { type ReactNode } from "react";

/* ============================================================================
   Card — the surface primitive.
   `tone` controls elevation; `interactive` adds the hover lift used for
   clickable cards. Colours come from design tokens so dark mode is automatic.
   ========================================================================== */

type CardTone = "flat" | "raised" | "elevated";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
  interactive?: boolean;
  as?: "div" | "article" | "section";
}

const toneClasses: Record<CardTone, string> = {
  flat: "border border-[var(--line)] bg-[var(--surface)]",
  raised: "border border-[var(--line)] bg-[var(--surface)] shadow-sm",
  elevated: "border border-[var(--line)] bg-[var(--surface)] shadow-md",
};

export function Card({
  children,
  className = "",
  tone = "raised",
  interactive = false,
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        toneClasses[tone]
      } ${interactive ? "lift cursor-pointer" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Renders the title as an h2; use h3 inside a card that already has one. */
  as?: "h2" | "h3";
}

export function CardHeader({
  title,
  description,
  action,
  as: Heading = "h2",
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Heading className="text-base font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </Heading>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`mt-5 flex items-center gap-3 border-t border-[var(--line)] pt-4 ${className}`}
    >
      {children}
    </div>
  );
}