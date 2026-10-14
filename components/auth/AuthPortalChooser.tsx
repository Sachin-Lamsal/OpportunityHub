import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LOGIN_PORTAL_CARDS } from "@/lib/constants";

interface AuthPortalChooserProps {
  mode: "login" | "signup";
  error?: string;
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

export default function AuthPortalChooser({ mode, error }: AuthPortalChooserProps) {
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
