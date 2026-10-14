export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not specified";

  return new Date(dateStr).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "No deadline";

  const deadline = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formatted = formatDate(dateStr);

  if (diffDays < 0) return `${formatted} (passed)`;
  if (diffDays === 0) return `${formatted} (today)`;
  if (diffDays === 1) return `${formatted} (tomorrow)`;
  if (diffDays <= 7) return `${formatted} (${diffDays} days left)`;

  return formatted;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}
