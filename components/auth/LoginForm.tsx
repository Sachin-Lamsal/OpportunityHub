"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/lib/actions/auth";
import { useActionRedirect } from "@/components/auth/useActionRedirect";
import type { AccountType } from "@/lib/types";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { signupPathFor } from "@/lib/auth/account";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import GmailSignupButton from "@/components/auth/GmailSignupButton";

const initialState: AuthState = {};

interface LoginFormProps {
  accountType: AccountType;
  authError?: string;
}

export default function LoginForm({ accountType, authError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState);
  useActionRedirect(state.redirectTo);

  const label = ACCOUNT_TYPE_LABELS[accountType];

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">{label} log in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in to your {label.toLowerCase()} account on OpportunityHub.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="account_type" value={accountType} />
        <FormMessage error={authError ?? state.error} />

        {/* Gmail Login Button */}
        <div className="mb-6">
          <GmailSignupButton accountType={accountType} />
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with email</span>
            </div>
          </div>
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          ← All login options
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href={signupPathFor(accountType)}
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign up as {label.toLowerCase()}
        </Link>
      </p>
    </Card>
  );
}
