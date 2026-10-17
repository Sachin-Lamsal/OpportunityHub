/**
 * Shared field styling so Input / Select / Textarea stay visually identical.
 * Token-based, so dark mode works without extra variants.
 */
export const fieldBase =
  "block w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-2.5 " +
  "text-sm text-[var(--ink)] shadow-xs transition-all duration-200 " +
  "placeholder:text-[var(--muted)] " +
  "focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/12 " +
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:opacity-60 " +
  "aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:focus:ring-[var(--color-danger)]/12";

export const labelBase =
  "mb-1.5 block text-sm font-medium text-[var(--ink-soft)]";

export const errorBase =
  "mt-1.5 flex items-start gap-1.5 text-sm font-medium text-[var(--color-danger)]";
