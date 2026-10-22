"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAdmin, type AuthState } from "@/lib/actions/auth";
import { useActionRedirect } from "@/components/auth/useActionRedirect";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";

const initialState: AuthState = {};

interface AdminLoginFormProps {
  authError?: string;
  authSuccess?: string;
}

export default function AdminLoginForm({
  authError,
  authSuccess,
}: AdminLoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);
  const submit = useActionFormSubmit(formAction);
  useActionRedirect(state.redirectTo);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg text-white"
        >
          🛡️
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Administrator sign in
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Use an email address assigned an administrator role in OpportunityHub.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <FormMessage error={authError ?? state.error} success={authSuccess ?? state.success} />

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
          {pending ? "Verifying access…" : "Sign in to admin"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          ← Other sign-in options
        </Link>
      </p>
    </Card>
  );
}
