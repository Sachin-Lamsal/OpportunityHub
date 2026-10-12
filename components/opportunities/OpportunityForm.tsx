"use client";

import { useActionState } from "react";
import {
  createOpportunity,
  updateOpportunity,
  type CreateOpportunityState,
} from "@/lib/actions/create-opportunity";
import { useActionRedirect } from "@/components/auth/useActionRedirect";
import { OPPORTUNITY_TYPES, SUBJECT_AREAS } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";

const initialState: CreateOpportunityState = {};

interface OpportunityFormProps {
  initialData?: Opportunity;
}

export default function OpportunityForm({ initialData }: OpportunityFormProps) {
  const isEditing = Boolean(initialData);
  const actionToUse = isEditing ? updateOpportunity : createOpportunity;

  const [state, formAction, pending] = useActionState(actionToUse, initialState);
  useActionRedirect(state.redirectTo);

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">
        {isEditing ? "Edit opportunity" : "Add opportunity"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isEditing
          ? "Update details for this opportunity."
          : "Publish a program, workshop, competition, or other opportunity for students on OpportunityHub."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {initialData?.id && (
          <input type="hidden" name="opportunity_id" value={initialData.id} />
        )}
        <FormMessage error={state.error} success={state.success} />

        <Input
          label="Title"
          name="title"
          type="text"
          required
          defaultValue={initialData?.title ?? ""}
          placeholder="e.g. National Science Olympiad 2026"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            name="type"
            options={OPPORTUNITY_TYPES}
            required
            defaultValue={initialData?.type ?? ""}
          />

          <Select
            label="Subject area (optional)"
            name="subject_area"
            options={SUBJECT_AREAS}
            defaultValue={initialData?.subject_area ?? ""}
          />
        </div>

        <Textarea
          label="Description"
          name="description"
          required
          defaultValue={initialData?.description ?? ""}
          placeholder="What is it, who is it for, and why should students apply?"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Cost (optional)"
            name="cost"
            type="text"
            defaultValue={initialData?.cost ?? ""}
            placeholder="e.g. Free, $25, or Scholarship available"
          />

          <Input
            label="Deadline (optional)"
            name="deadline"
            type="date"
            defaultValue={initialData?.deadline ?? ""}
          />
        </div>

        <Input
          label="Registration link (optional)"
          name="registration_link"
          type="url"
          defaultValue={initialData?.registration_link ?? ""}
          placeholder="https://…"
        />

        <Input
          label="Location (optional)"
          name="location"
          type="text"
          defaultValue={initialData?.location ?? ""}
          placeholder="Kathmandu or leave blank if online"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_online"
            defaultChecked={initialData?.is_online ?? false}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          This opportunity is fully online
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? isEditing
                ? "Saving changes…"
                : "Publishing…"
              : isEditing
                ? "Save changes"
                : "Publish opportunity"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
