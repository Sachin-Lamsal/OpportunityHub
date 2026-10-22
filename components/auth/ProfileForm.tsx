"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  linkSchoolToStudent,
  unlinkSchoolFromStudent,
  logout,
  type AuthState,
} from "@/lib/actions/auth";
import { EDUCATION_LEVELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";

const initialState: AuthState = {};

interface ProfileFormProps {
  profile: Profile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const [linkState, linkFormAction, linkPending] = useActionState(
    linkSchoolToStudent,
    initialState,
  );
  const submit = useActionFormSubmit(formAction);
  const submitLink = useActionFormSubmit(linkFormAction);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [isUnlinking, startUnlinkTransition] = useTransition();
  const router = useRouter();

  const handleUnlink = () => {
    if (
      !confirm(
        `Are you sure you want to unlink from ${profile.school_name || "your school"}? Your school counselor will no longer have access to view your portfolio.`,
      )
    ) {
      return;
    }
    setUnlinkError(null);
    startUnlinkTransition(async () => {
      const res = await unlinkSchoolFromStudent();
      if (res.error) {
        setUnlinkError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
        <form action={logout} className="mt-4">
          <input type="hidden" name="account_type" value="student" />
          <Button type="submit" variant="outline" size="sm">
            Log out
          </Button>
        </form>
      </Card>

      {profile.school_id ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  School affiliation
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Linked
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Linked to:{" "}
                <Link
                  href={`/school/${profile.school_id}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {profile.school_name || "Your school"} ↗
                </Link>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Your school counselor can view your portfolio progress and share opportunities with you.
              </p>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUnlinking}
                onClick={handleUnlink}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                {isUnlinking ? "Unlinking…" : "Unlink / Change school"}
              </Button>
            </div>
          </div>
          {unlinkError && (
            <p className="mt-3 text-xs text-rose-600">{unlinkError}</p>
          )}
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Link your school
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter your school code or an invite code to connect with your school counselor.
          </p>

          <form onSubmit={submitLink} className="mt-4 space-y-4">
            <FormMessage error={linkState.error} success={linkState.success} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="School code"
                name="school_code"
                type="text"
                placeholder="8-character code"
              />
              <Input
                label="Invite code (if required)"
                name="invite_code"
                type="text"
                placeholder="One-time invite code"
              />
            </div>

            <Button type="submit" size="sm" disabled={linkPending}>
              {linkPending ? "Linking…" : "Link school"}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Your profile</h2>
        <p className="mt-1 text-sm text-slate-600">
          Update your details anytime. More fields can be filled in after signup.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormMessage error={state.error} success={state.success} />

          <Select
            label="Education level"
            name="education_level"
            options={EDUCATION_LEVELS}
            defaultValue={profile.education_level ?? ""}
          />

          <Input
            label="Dream university"
            name="dream_universities"
            type="text"
            defaultValue={profile.dream_universities ?? ""}
            placeholder="Your target university"
          />

          <Textarea
            label="Subjects"
            name="subjects"
            defaultValue={profile.subjects ?? ""}
            placeholder="e.g. Physics, Mathematics, English"
          />

          <Textarea
            label="Interests"
            name="interests"
            defaultValue={profile.interests ?? ""}
            placeholder="e.g. robotics, debate, music"
          />

          <Textarea
            label="Career interests"
            name="career_interests"
            defaultValue={profile.career_interests ?? ""}
            placeholder="e.g. engineering, medicine, business"
          />

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Email & Notification Preferences</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deadline reminders are sent via Brevo when enabled. Newsletter preference is saved for
              the monthly digest cron (1st of each month, production).
            </p>

            <div className="mt-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="email_reminders"
                  value="true"
                  defaultChecked={profile.email_reminders ?? true}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    Saved Opportunity Deadline Reminders
                  </span>
                  <p className="text-xs text-slate-500">
                    Receive email alerts before deadlines for opportunities you save to your tracker.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="newsletter_subscribed"
                  value="true"
                  defaultChecked={profile.newsletter_subscribed ?? true}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    OpportunityHub Newsletter & Digests
                  </span>
                  <p className="text-xs text-slate-500">
                    Monthly roundups of newly verified high-school & university opportunities and scholarships.
                    Requires Brevo and the production newsletter cron (see README).
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
