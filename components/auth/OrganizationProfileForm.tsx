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
import RequestPublisherVerificationButton from "@/components/publishers/RequestPublisherVerificationButton";
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";

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
  const submit = useActionFormSubmit(formAction);

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

        <form onSubmit={submit} className="mt-6 space-y-4">
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

          <Input
            label="Official website (optional)"
            name="website_url"
            type="url"
            defaultValue={profile.website_url ?? ""}
            placeholder="https://your-organization.org"
          />

          <Textarea
            label="About (optional)"
            name="organization_description"
            defaultValue={profile.organization_description ?? ""}
            placeholder="Short description of your school or organization"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Facebook (optional)"
              name="facebook_url"
              type="url"
              defaultValue={profile.social_links?.Facebook ?? ""}
              placeholder="https://facebook.com/…"
            />
            <Input
              label="Instagram (optional)"
              name="instagram_url"
              type="url"
              defaultValue={profile.social_links?.Instagram ?? ""}
              placeholder="https://instagram.com/…"
            />
            <Input
              label="LinkedIn (optional)"
              name="linkedin_url"
              type="url"
              defaultValue={profile.social_links?.LinkedIn ?? ""}
              placeholder="https://linkedin.com/…"
            />
          </div>

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

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Profile verification</h2>
        <p className="mt-1 text-sm text-slate-600">
          Verification checks that this account represents the school or organization. Each opportunity is reviewed separately.
        </p>
        <div className="mt-4">
          <RequestPublisherVerificationButton
            status={profile.publisher_verification_status ?? "unverified"}
          />
          {profile.publisher_verification_note ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Review note: {profile.publisher_verification_note}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
