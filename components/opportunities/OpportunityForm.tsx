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
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";

const initialState: CreateOpportunityState = {};

interface OpportunityFormProps {
  initialData?: Opportunity;
  copyFrom?: Opportunity;
}

export default function OpportunityForm({
  initialData,
  copyFrom,
}: OpportunityFormProps) {
  const isEditing = Boolean(initialData);
  const isNewEdition = Boolean(copyFrom);
  const data = initialData ?? copyFrom;
  const actionToUse = isEditing ? updateOpportunity : createOpportunity;
  const [state, formAction, pending] = useActionState(actionToUse, initialState);
  const submit = useActionFormSubmit(formAction);
  useActionRedirect(state.redirectTo);

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">
        {isEditing
          ? "Edit opportunity"
          : isNewEdition
            ? "Create a new edition"
            : "Create opportunity"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isEditing
          ? "Saving changes creates a draft. Submit it again when it is ready for review."
          : "Save a draft while you work, then submit it for an administrator to review before students can see it."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-8">
        {initialData?.id ? (
          <input type="hidden" name="opportunity_id" value={initialData.id} />
        ) : null}
        {copyFrom?.id ? (
          <input
            type="hidden"
            name="parent_opportunity_id"
            value={copyFrom.parent_opportunity_id ?? copyFrom.id}
          />
        ) : null}
        <FormMessage error={state.error} success={state.success} />

        {isNewEdition && copyFrom ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-950">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🔄</span> Recurring Edition / Next Instance
            </p>
            <p className="text-xs text-indigo-800 mt-1">
              You are proposing a new instance for <strong>{copyFrom.title}</strong>.
              Core information has been pre-filled. Please verify or update the edition label, deadlines, and application links.
            </p>
            <p className="text-xs text-indigo-700 mt-1 font-medium">
              Note: This submission is queued as a suggestion for administrator review and will not appear live until approved.
            </p>
          </div>
        ) : null}

        {initialData?.review_note ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Reviewer note</p>
            <p className="mt-1 whitespace-pre-wrap">{initialData.review_note}</p>
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Basic information</h2>
            <p className="mt-1 text-sm text-slate-600">
              Describe the opportunity clearly enough for a student to understand it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Title"
              name="title"
              type="text"
              required
              defaultValue={data?.title ?? ""}
              placeholder="e.g. National Science Olympiad 2026"
            />
            <Input
              label="Organizer or Host (optional)"
              name="organizer"
              type="text"
              defaultValue={data?.organizer ?? ""}
              placeholder="e.g. Nepal Robotics Club, British Council"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              name="type"
              options={OPPORTUNITY_TYPES}
              required
              defaultValue={data?.type ?? ""}
            />
            <Select
              label="Subject area (optional)"
              name="subject_area"
              options={SUBJECT_AREAS}
              defaultValue={data?.subject_area ?? ""}
            />
          </div>

          <Textarea
            label="Description"
            name="description"
            required
            rows={5}
            defaultValue={data?.description ?? ""}
            placeholder="What is it, who is it for, and why should students apply?"
          />
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div>
            <h2 className="font-semibold text-slate-900">Eligibility and participation</h2>
            <p className="mt-1 text-sm text-slate-600">
              Include the requirements and steps students need to take.
            </p>
          </div>

          <Input
            label="Grade or age requirements (optional)"
            name="grade_requirements"
            type="text"
            defaultValue={data?.grade_requirements ?? ""}
            placeholder="e.g. Grades 9–12"
          />
          <Textarea
            label="Eligibility details (optional)"
            name="eligibility_details"
            defaultValue={data?.eligibility_details ?? ""}
            placeholder="Location, prerequisite, team size, or other requirements"
          />
          <Textarea
            label="How to apply (optional)"
            name="application_steps"
            defaultValue={data?.application_steps ?? ""}
            placeholder="Explain the application or registration steps"
          />
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div>
            <h2 className="font-semibold text-slate-900">Dates, format, and cost</h2>
            <p className="mt-1 text-sm text-slate-600">
              These details help students decide whether they can participate.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Deadline (optional)"
              name="deadline"
              type="date"
              defaultValue={isNewEdition ? "" : (data?.deadline ?? "")}
            />
            <Input
              label="Start date (optional)"
              name="start_date"
              type="date"
              defaultValue={isNewEdition ? "" : (data?.start_date ?? "")}
            />
            <Input
              label="End date (optional)"
              name="end_date"
              type="date"
              defaultValue={isNewEdition ? "" : (data?.end_date ?? "")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Cost (optional)"
              name="cost"
              type="text"
              defaultValue={data?.cost ?? ""}
              placeholder="e.g. Free, $25, or scholarship available"
            />
            <Input
              label="Location (optional)"
              name="location"
              type="text"
              defaultValue={data?.location ?? ""}
              placeholder="Kathmandu or leave blank if online"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_online"
              defaultChecked={data?.is_online ?? false}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            This opportunity is fully online
          </label>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div>
            <h2 className="font-semibold text-slate-900">Official source</h2>
            <p className="mt-1 text-sm text-slate-600">
              A source or registration link is required when you submit the listing for review.
            </p>
          </div>

          <Input
            label="Official source URL (optional for drafts)"
            name="source_url"
            type="url"
            defaultValue={data?.source_url ?? ""}
            placeholder="https://your-organization.org/opportunity"
          />
          <Input
            label="Registration link (optional for drafts)"
            name="registration_link"
            type="url"
            defaultValue={data?.registration_link ?? ""}
            placeholder="https://…"
          />
        </section>

        {isNewEdition ? (
          <section className="space-y-4 border-t border-slate-200 pt-6">
            <div>
              <h2 className="font-semibold text-slate-900">Edition & recurring series</h2>
              <p className="mt-1 text-sm text-slate-600">
                Provide an edition label or year so students can distinguish this instance from previous years.
              </p>
            </div>
            <Input
              label="Edition label"
              name="edition_year"
              type="text"
              defaultValue={
                copyFrom?.edition_year && !isNaN(Number(copyFrom.edition_year))
                  ? String(Number(copyFrom.edition_year) + 1)
                  : String(new Date().getFullYear())
              }
              placeholder="e.g. 2026, Summer 2026, Annual 2026"
            />
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <Button
            type="submit"
            name="submission_intent"
            value="draft"
            variant="outline"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="submit"
            name="submission_intent"
            value="review"
            disabled={pending}
          >
            {pending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
