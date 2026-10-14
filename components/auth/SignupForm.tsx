"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/lib/actions/auth";
import { useActionRedirect } from "@/components/auth/useActionRedirect";
import type { AccountType } from "@/lib/types";
import { ACCOUNT_TYPE_LABELS, EDUCATION_LEVELS } from "@/lib/constants";
import { loginPathFor } from "@/lib/auth/account";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import GmailSignupButton from "@/components/auth/GmailSignupButton";

const initialState: AuthState = {};

interface SignupFormProps {
  accountType: AccountType;
}

export default function SignupForm({ accountType }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  useActionRedirect(state.redirectTo);

  const label = ACCOUNT_TYPE_LABELS[accountType];
  const isStudent = accountType === "student";

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">
        {isStudent ? "Create your student account" : `Register your ${label.toLowerCase()}`}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isStudent
          ? "Start building your university portfolio today."
          : accountType === "school"
            ? "Get a school code to share with students and publish opportunities."
            : "Publish opportunities for students across OpportunityHub."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="account_type" value={accountType} />
        <FormMessage error={state.error} success={state.success} />

        {/* Gmail Sign-up Button */}
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
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
        />

        {!isStudent && (
          <Input
            label={accountType === "school" ? "School name" : "Organization name"}
            name="organization_name"
            type="text"
            required
            placeholder={
              accountType === "school"
                ? "e.g. Kathmandu Model Secondary School"
                : "e.g. Youth Innovation Nepal"
            }
          />
        )}

        {isStudent && (
          <>
            <Select
              label="Education level"
              name="education_level"
              options={EDUCATION_LEVELS}
              required
            />

            <Input
              label="Dream university"
              name="dream_university"
              type="text"
              required
              placeholder="e.g. TU, Kathmandu University, abroad…"
            />

            <Input
              label="School code (optional)"
              name="school_code"
              type="text"
              placeholder="8-character code from your school"
              autoComplete="off"
            />

            <Input
              label="Invite code (if your school requires it)"
              name="invite_code"
              type="text"
              placeholder="One-time code from your school"
              autoComplete="off"
            />
          </>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
          ← All signup options
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={loginPathFor(accountType)}
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
