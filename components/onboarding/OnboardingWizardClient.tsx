"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, type OnboardingActivityInput } from "@/lib/actions/onboarding";
import type { Opportunity } from "@/lib/types";
import { SUBJECT_AREAS, ACTIVITY_CATEGORIES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface OnboardingWizardClientProps {
  initialOpportunities: Opportunity[];
}

export default function OnboardingWizardClient({
  initialOpportunities,
}: OnboardingWizardClientProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Step 2 State: Past experiences / portfolio
  const [activities, setActivities] = useState<OnboardingActivityInput[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<typeof ACTIVITY_CATEGORIES[number]>("Academic");
  const [customDate, setCustomDate] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Step 3 State: Interests & study goals
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [intendedMajor, setIntendedMajor] = useState("");
  const [dreamUniversity, setDreamUniversity] = useState("");

  const filteredOpportunities = initialOpportunities.filter((opp) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      opp.title.toLowerCase().includes(term) ||
      opp.organizer?.toLowerCase().includes(term) ||
      opp.type.toLowerCase().includes(term)
    );
  }).slice(0, 6);

  function toggleInterest(subject: string) {
    setSelectedInterests((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    );
  }

  function handleAddOpportunity(opp: Opportunity) {
    if (activities.some((a) => a.opportunity_id === opp.id)) return;
    setActivities((prev) => [
      ...prev,
      {
        title: opp.title,
        category: (opp.type === "Competition" || opp.type === "Olympiad") ? "Academic" : "Leadership",
        description: `Participated in ${opp.title} (${opp.organizer || "OpportunityHub"})`,
        date: new Date().toISOString().split("T")[0],
        opportunity_id: opp.id,
      },
    ]);
  }

  function handleAddCustomActivity() {
    if (!customTitle.trim()) return;
    setActivities((prev) => [
      ...prev,
      {
        title: customTitle.trim(),
        category: customCategory,
        description: "Completed activity added during onboarding",
        date: customDate || new Date().toISOString().split("T")[0],
      },
    ]);
    setCustomTitle("");
    setCustomDate("");
    setShowCustomModal(false);
  }

  function handleRemoveActivity(index: number) {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        activities,
        interests: selectedInterests,
        intended_major: intendedMajor,
        dream_universities: dreamUniversity,
      });

      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        setError(res.error || "Failed to complete onboarding.");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          <span className={step >= 1 ? "text-indigo-600 font-bold" : ""}>1. Intro</span>
          <span className={step >= 2 ? "text-indigo-600 font-bold" : ""}>2. Portfolio</span>
          <span className={step >= 3 ? "text-indigo-600 font-bold" : ""}>3. Interests</span>
          <span className={step >= 4 ? "text-indigo-600 font-bold" : ""}>4. Ready</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* STEP 1: Introduction */}
      {step === 1 && (
        <Card className="text-center p-8 space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
            🚀
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Let&apos;s personalize OpportunityHub for you
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              Setting up your profile helps us recommend relevant competitions, scholarships, and programs for your grade level — and avoids suggesting things you&apos;ve already completed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-left pt-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-xl">🎯</span>
              <h3 className="font-semibold text-slate-900 text-sm mt-2">Targeted Matches</h3>
              <p className="text-xs text-slate-500 mt-1">
                Opportunities filtered to your specific curriculum and interests.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-xl">📁</span>
              <h3 className="font-semibold text-slate-900 text-sm mt-2">Portfolio Builder</h3>
              <p className="text-xs text-slate-500 mt-1">
                Track extracurriculars and auto-generate an academic CV.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-xl">🤖</span>
              <h3 className="font-semibold text-slate-900 text-sm mt-2">AI Advisor</h3>
              <p className="text-xs text-slate-500 mt-1">
                Admissions mentorship aware of your past achievements.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={() => setStep(2)} size="md" className="w-full sm:w-auto px-8">
              Start Personalization →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Build Your Portfolio */}
      {step === 2 && (
        <Card className="p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Step 2 of 4
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              What experiences or competitions have you already done?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add past activities so we understand your experience level and don&apos;t repeat beginner suggestions. You can search our directory or add your own.
            </p>
          </div>

          {/* Added Activities list */}
          {activities.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900">
                Added to your portfolio ({activities.length})
              </p>
              <div className="space-y-1.5">
                {activities.map((act, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm shadow-xs"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{act.title}</span>
                      <span className="ml-2 text-xs text-slate-400">· {act.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(index)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Existing Opportunities */}
          <div className="space-y-3">
            <Input
              label="Search OpportunityHub directory"
              type="search"
              placeholder="Search math olympiad, hackathons, robotics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {filteredOpportunities.map((opp) => {
                const isAdded = activities.some((a) => a.opportunity_id === opp.id);
                return (
                  <div
                    key={opp.id}
                    className="rounded-xl border border-slate-200 p-3 flex flex-col justify-between hover:border-indigo-300 transition-colors bg-white text-left"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-md px-2 py-0.5">
                        {opp.type}
                      </span>
                      <p className="font-medium text-sm text-slate-900 mt-1 line-clamp-1">
                        {opp.title}
                      </p>
                      {opp.organizer && (
                        <p className="text-xs text-slate-500 line-clamp-1">{opp.organizer}</p>
                      )}
                    </div>
                    <div className="mt-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={isAdded ? "outline" : "primary"}
                        disabled={isAdded}
                        onClick={() => handleAddOpportunity(opp)}
                      >
                        {isAdded ? "✓ Added" : "+ Add to Portfolio"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomModal(true)}
            >
              + Add Custom Experience
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                Skip for now
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Next: Interests →
              </Button>
            </div>
          </div>

          {/* Custom Experience Modal */}
          {showCustomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Add Custom Activity</h3>
                <Input
                  label="Activity / Program Title"
                  required
                  placeholder="e.g. School Debate Club President"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                  >
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Date / Year"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCustomModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleAddCustomActivity}>
                    Save Activity
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* STEP 3: Interests & Goals */}
      {step === 3 && (
        <Card className="p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Step 3 of 4
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Academic Interests & Study Goals
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick subjects you enjoy exploring. Study goals and dream universities are completely optional.
            </p>
          </div>

          {/* Subject Area Chips */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Select your academic interests
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_AREAS.map((subject) => {
                const isSelected = selectedInterests.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleInterest(subject)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <Input
              label="Intended Major / Field (Optional)"
              placeholder="e.g. Computer Science, Economics"
              value={intendedMajor}
              onChange={(e) => setIntendedMajor(e.target.value)}
            />
            <Input
              label="Dream University (Optional)"
              placeholder="e.g. MIT, Oxford, KU, Ashoka"
              value={dreamUniversity}
              onChange={(e) => setDreamUniversity(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => setStep(4)}>
              Review & Finish →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Review & Ready */}
      {step === 4 && (
        <Card className="p-8 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-3xl">
            ✨
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">You&apos;re all set!</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your profile is configured. Your dashboard and opportunity feed are now tailored to your goals.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left text-sm space-y-3 max-w-md mx-auto">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Past Activities</span>
              <p className="text-slate-900 font-medium">{activities.length} activities added to portfolio</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Interests</span>
              <p className="text-slate-900 font-medium">
                {selectedInterests.length > 0 ? selectedInterests.join(", ") : "General exploration"}
              </p>
            </div>
            {intendedMajor && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Field of Study</span>
                <p className="text-slate-900 font-medium">{intendedMajor}</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button onClick={handleFinish} disabled={isPending} size="md" className="w-full sm:w-auto px-8">
              {isPending ? "Entering OpportunityHub..." : "Enter OpportunityHub Feed →"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
