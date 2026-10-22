"use client";

import { useState, useActionState } from "react";
import { createActivity, type ActivityState } from "@/lib/actions/activities";
import { useActionRedirect } from "@/components/auth/useActionRedirect";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { Opportunity, ActivityCategory } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FormMessage from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { useActionFormSubmit } from "@/components/ui/useActionFormSubmit";
import { useUnsavedChangesGuard } from "@/components/ui/useUnsavedChangesGuard";

const initialState: ActivityState = {};

interface ActivityFormProps {
  initialOpportunity?: Opportunity | null;
  availableOpportunities?: Opportunity[];
}

function mapOpportunityTypeToCategory(type?: string): ActivityCategory {
  if (!type) return "Academic";
  const lower = type.toLowerCase();
  if (lower.includes("volunt") || lower.includes("service")) return "Service";
  if (lower.includes("leader") || lower.includes("club")) return "Leadership";
  if (lower.includes("intern") || lower.includes("work")) return "Work Experience";
  if (lower.includes("art") || lower.includes("creative")) return "Creative";
  if (lower.includes("hack") || lower.includes("project")) return "Projects";
  return "Academic";
}

export default function ActivityForm({
  initialOpportunity,
  availableOpportunities = [],
}: ActivityFormProps) {
  const [state, formAction, pending] = useActionState(createActivity, initialState);
  const submit = useActionFormSubmit(formAction);
  useActionRedirect(state.redirectTo);

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(
    initialOpportunity || null,
  );

  // Warn before a student loses a half-written activity entry.
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(
    isDirty,
    "You have unsaved changes to this activity. Leave this page and lose them?",
  );

  // A saved activity is not an unsaved change any more, so the warning must
  // not fire while the redirect is happening. The result object identity
  // changes once per action run, so comparing it with the last one that was
  // seen is enough.
  const [savedResult, setSavedResult] = useState<ActivityState | null>(null);
  if (state.redirectTo && state !== savedResult) {
    setSavedResult(state);
    setIsDirty(false);
  }

  const [searchFilter, setSearchFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const filteredOpps = availableOpportunities
    .filter((opp) => {
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      return (
        opp.title.toLowerCase().includes(term) ||
        opp.organizer?.toLowerCase().includes(term)
      );
    })
    .slice(0, 6);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Add activity to portfolio</h1>
        {!selectedOpp && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? "Enter custom activity" : "🔍 Link to OpportunityHub Listing"}
          </Button>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Log an extracurricular activity, competition, or leadership role you&apos;ve completed.
      </p>

      {/* Linked Opportunity Card */}
      {selectedOpp && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 flex items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Linked Opportunity
            </span>
            <p className="font-bold text-indigo-950 mt-0.5">{selectedOpp.title}</p>
            {selectedOpp.organizer && (
              <p className="text-xs text-indigo-800">{selectedOpp.organizer}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedOpp(null);
              setIsDirty(true);
            }}
          >
            Unlink
          </Button>
        </div>
      )}

      {/* Search / Link selector */}
      {showSearch && !selectedOpp && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <Input
            label="Search OpportunityHub Database"
            placeholder="Search by title or organizer..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredOpps.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => {
                  setSelectedOpp(opp);
                  setShowSearch(false);
                  // The linked opportunity is part of what the student would
                  // lose by leaving the page.
                  setIsDirty(true);
                }}
                className="text-left rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-400 hover:shadow-xs transition-all"
              >
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                  {opp.type}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                  {opp.title}
                </p>
                {opp.organizer && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">{opp.organizer}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={submit}
        onChange={() => setIsDirty(true)}
        className="mt-6 space-y-4"
      >
        <FormMessage error={state.error} success={state.success} />

        {selectedOpp && (
          <input type="hidden" name="opportunity_id" value={selectedOpp.id} />
        )}

        <Input
          label="Title"
          name="title"
          type="text"
          required
          defaultValue={selectedOpp?.title || ""}
          key={selectedOpp?.id || "custom-title"}
          placeholder="e.g. Harvard Model United Nations Delegate"
        />

        <Select
          label="Category"
          name="category"
          options={ACTIVITY_CATEGORIES}
          required
          defaultValue={
            selectedOpp ? mapOpportunityTypeToCategory(selectedOpp.type) : "Academic"
          }
          key={selectedOpp?.id || "custom-cat"}
        />

        <Textarea
          label="Description"
          name="description"
          required
          defaultValue={
            selectedOpp
              ? `Participated in ${selectedOpp.title}${selectedOpp.organizer ? ` organized by ${selectedOpp.organizer}` : ""}.`
              : ""
          }
          key={selectedOpp?.id || "custom-desc"}
          placeholder="What did you do? What was the outcome or role?"
        />

        <Input
          label="Date"
          name="date"
          type="date"
          required
          defaultValue={today}
          max={today}
        />

        <Textarea
          label="Notes (optional)"
          name="notes"
          placeholder="Any awards won, lessons learned, or details for your CV later"
        />

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save activity"}
          </Button>
          <Button href="/portfolio" variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
