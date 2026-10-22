"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createSchoolInvite,
  deactivateSchoolInvite,
  type InviteActionState,
} from "@/lib/actions/school-invites";
import type { SchoolInviteCode } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";

const initialState: InviteActionState = {};

interface SchoolInvitePanelProps {
  invites: SchoolInviteCode[];
}

function inviteStatus(invite: SchoolInviteCode): string {
  if (!invite.active) return "Deactivated";
  if (invite.use_count >= invite.max_uses) return "Used up";
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return "Expired";
  }
  return "Active";
}

export default function SchoolInvitePanel({ invites }: SchoolInvitePanelProps) {
  const [state, formAction, pending] = useActionState(
    createSchoolInvite,
    initialState,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const submit = useActionFormSubmit(formAction);
  const [isDeactivating, startDeactivateTransition] = useTransition();

  const handleDeactivate = (inviteId: string) => {
    if (!confirm("Deactivate this invite code? Students will no longer be able to use it.")) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    startDeactivateTransition(async () => {
      const res = await deactivateSchoolInvite(inviteId);
      if (res.error) {
        setActionError(res.error);
      } else if (res.success) {
        setActionSuccess(res.success);
      }
    });
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Student invites</h2>
      <p className="mt-1 text-sm text-slate-600">
        Generate codes for students to join when invite-only registration is
        on. Each code can be limited to a number of uses.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 border-b border-slate-100 pb-6">
        <FormMessage error={state.error} success={state.success} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Label (optional)"
            name="label"
            type="text"
            placeholder="e.g. Grade 11 batch 2026"
          />
          <Input
            label="Max uses"
            name="max_uses"
            type="number"
            min={1}
            defaultValue={1}
          />
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create invite code"}
        </Button>
      </form>

      <div className="mt-4">
        <FormMessage error={actionError ?? undefined} success={actionSuccess ?? undefined} />
      </div>

      {invites.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No invite codes yet.</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-slate-500 sm:hidden">
            Swipe sideways to see code details and actions.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[35rem] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Label</th>
                  <th className="py-2 pr-4 font-medium">Uses</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invites.map((invite) => {
                  const status = inviteStatus(invite);
                  const canDeactivate =
                    invite.active && status === "Active";

                  return (
                    <tr key={invite.id}>
                      <td className="py-3 pr-4 font-mono text-xs font-semibold tracking-wide text-slate-900">
                        {invite.code}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {invite.label ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {invite.use_count}/{invite.max_uses}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{status}</td>
                      <td className="py-3 text-right">
                        {canDeactivate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isDeactivating}
                            onClick={() => handleDeactivate(invite.id)}
                          >
                            {isDeactivating ? "Deactivating…" : "Deactivate"}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
