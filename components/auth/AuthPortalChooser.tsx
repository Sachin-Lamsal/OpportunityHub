import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LOGIN_PORTAL_CARDS } from "@/lib/constants";

interface AuthPortalChooserProps {
  mode: "login" | "signup";
  error?: string;
  verified?: boolean;
}

const accentClasses = {
  indigo: "border-indigo-200 bg-indigo-50/50 hover:border-indigo-300",
  emerald: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
  violet: "border-violet-200 bg-violet-50/50 hover:border-violet-300",
} as const;

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "We couldn't complete your sign-in. Please try again, or make sure Google sign-in is configured.",
  oauth_failed:
    "Google sign-in failed. Please try again.",
};

export default function AuthPortalChooser({ mode, error, verified }: AuthPortalChooserProps) {
  const isLogin = mode === "login";
  const errorMessage = error
    ? ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {isLogin ? "Choose how to log in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isLogin
            ? "Pick the portal that matches your role on OpportunityHub."
            : "Students, schools, and organizations each have their own signup flow."}
        </p>
      </div>

      {verified && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
          <span>Email confirmed successfully! Please select your account type below to log in.</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4">
        {LOGIN_PORTAL_CARDS.map((portal) => (
          <Link
            key={portal.accountType}
            href={isLogin ? portal.href : portal.signupHref}
            className="block"
          >
            <Card
              className={`transition-colors ${accentClasses[portal.accent]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {portal.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {portal.description}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-indigo-600">
                  {isLogin ? "Log in →" : "Sign up →"}
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {isLogin && (
          <Link href="/login/admin" className="block">
            <Card className="border-slate-300 bg-slate-50 transition-colors hover:border-slate-400">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Administrator access
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review discovery, publisher, and platform administration work.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-slate-700">
                  Log in →
                </span>
              </div>
            </Card>
          </Link>
        )}
      </div>

      <p className="text-center text-sm text-slate-600">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-indigo-600">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
