"use client";

import { useActionState } from "react";
import {
  updateOrganizationProfile,
  type OrgProfileState,
} from "@/lib/actions/organization-profile";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";

const initialState: OrgProfileState = {};

interface OrganizationProfileFormProps {
  profile: Profile;
}

export default function OrganizationProfileForm({
  profile,
}: OrganizationProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationProfile,
    initialState,
  );

  const isSchool = profile.account_type === "school";
  const nameLabel = isSchool ? "School name" : "Organization name";

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
        <form action={logout} className="mt-4">
          <input type="hidden" name="account_type" value={profile.account_type} />
          <Button type="submit" variant="outline" size="sm">
            Log out
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Public details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Shown on opportunities you publish and visible to students where
          relevant.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <FormMessage error={state.error} success={state.success} />

          <Input
            label={nameLabel}
            name="organization_name"
            type="text"
            required
            defaultValue={profile.organization_name ?? ""}
          />

          <Input
            label="Contact info (optional)"
            name="contact_info"
            type="text"
            defaultValue={profile.contact_info ?? ""}
            placeholder="Email or phone for students to reach you"
          />

          <Textarea
            label="About (optional)"
            name="organization_description"
            defaultValue={profile.organization_description ?? ""}
            placeholder="Short description of your school or organization"
          />

          {isSchool ? (
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                name="students_invite_only"
                defaultChecked={profile.students_invite_only}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>
                <span className="font-medium text-slate-900">
                  Invite-only student registration
                </span>
                <span className="mt-1 block text-slate-600">
                  When enabled, students must use a one-time invite code from
                  below — the public school code alone is not enough.
                </span>
              </span>
            </label>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
