import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 text-slate-600">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
