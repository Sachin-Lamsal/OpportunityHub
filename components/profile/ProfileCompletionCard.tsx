import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getProfileCompletion } from "@/lib/profile/completion";
import type { Profile } from "@/lib/types";

/**
 * Shows how much of a student profile is filled in and what is still missing.
 * Every item links back to the profile page so the student can fix it.
 */
export default function ProfileCompletionCard({
  profile,
}: {
  profile: Profile | null;
}) {
  const completion = getProfileCompletion(profile);

  if (!completion) return null;

  const { percent, complete, total, missing } = completion;
  const isDone = missing.length === 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Profile completeness
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isDone
              ? "Your profile is complete — you get tailored suggestions and a full CV."
              : `${complete} of ${total} details filled in. Add the rest to get better suggestions.`}
          </p>
        </div>
        <span className="text-2xl font-bold text-indigo-700">{percent}%</span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {missing.length > 0 && (
        <ul className="mt-4 space-y-2">
          {missing.map((field) => (
            <li key={field.key} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300"
              />
              <span>
                <Link
                  href={`/profile#${field.key}`}
                  className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                >
                  {field.label}
                </Link>{" "}
                <span className="text-slate-500">— {field.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link
          href={
            missing.length > 0 ? `/profile#${missing[0].key}` : "/profile"
          }
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {isDone ? "Review your profile →" : "Complete your profile →"}
        </Link>
      </div>
    </Card>
  );
}
