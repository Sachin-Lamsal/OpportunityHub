interface FormMessageProps {
  error?: string;
  success?: string;
  /** Extra info shown under a success message. */
  info?: string;
}

/**
 * Unified inline feedback. Errors announce assertively, successes politely,
 * so screen readers are told without being interrupted.
 */
export default function FormMessage({ error, success, info }: FormMessageProps) {
  if (!error && !success) return null;

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V7Zm-1 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-[var(--color-success)]/25 bg-[var(--color-success-soft)] px-4 py-3 text-sm font-medium text-[var(--color-success)]"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
      <span>
        {success}
        {info && <span className="mt-0.5 block font-normal opacity-90">{info}</span>}
      </span>
    </div>
  );
}
