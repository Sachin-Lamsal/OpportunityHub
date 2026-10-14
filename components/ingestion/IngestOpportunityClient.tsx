"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ingestFromUrl,
  ingestFromImage,
  saveIngestedOpportunity,
} from "@/lib/actions/ingestion";
import type { OpportunityDraft } from "@/lib/ingestion/formatter";
import { OPPORTUNITY_TYPES, SUBJECT_AREAS } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import FormMessage from "@/components/ui/FormMessage";
import VerificationBadge from "@/components/opportunities/VerificationBadge";

export default function IngestOpportunityClient() {
  const [tab, setTab] = useState<"url" | "ocr">("url");
  const [urlInput, setUrlInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [isIngesting, startIngesting] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedDraft, setExtractedDraft] = useState<OpportunityDraft | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  const router = useRouter();

  function handleScrapeUrl(e: FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setError(null);
    setSuccess(null);
    setExtractedDraft(null);

    startIngesting(async () => {
      const res = await ingestFromUrl(urlInput);
      if (res.success && res.draft) {
        setExtractedDraft(res.draft);
        setSourcePreview(res.sourceTextPreview || null);
      } else {
        setError(res.error || "Failed to scrape and format web content.");
      }
    });
  }

  function handleOcrImage(e: FormEvent) {
    e.preventDefault();
    if (!imageFile && !imageUrlInput.trim()) {
      setError("Please choose an image file or provide an image URL.");
      return;
    }

    setError(null);
    setSuccess(null);
    setExtractedDraft(null);

    const formData = new FormData();
    if (imageFile) {
      formData.append("file", imageFile);
    }
    if (imageUrlInput.trim()) {
      formData.append("image_url", imageUrlInput.trim());
    }

    startIngesting(async () => {
      const res = await ingestFromImage(formData);
      if (res.success && res.draft) {
        setExtractedDraft(res.draft);
        setSourcePreview(res.sourceTextPreview || null);
      } else {
        setError(res.error || "Failed to extract text and format image content.");
      }
    });
  }

  function handleSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!extractedDraft) return;

    setError(null);
    startSaving(async () => {
      const res = await saveIngestedOpportunity(extractedDraft);
      if (res.success && res.opportunityId) {
        setSuccess("Opportunity published as Unverified (Internet Source)!");
        router.push(`/opportunities/${res.opportunityId}`);
      } else {
        setError(res.error || "Failed to save opportunity to database.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setTab("url");
            setError(null);
          }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            tab === "url"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🌐 1. Web Scraper (Link)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("ocr");
            setError(null);
          }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            tab === "ocr"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🖼️ 2. Poster / Flyer OCR (Image)
        </button>
      </div>

      <FormMessage error={error || undefined} success={success || undefined} />

      {/* Input Panels */}
      {!extractedDraft && (
        <Card>
          {tab === "url" ? (
            <form onSubmit={handleScrapeUrl} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Scrape Opportunity from Web Link
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Paste the official competition, scholarship, or hackathon page. The scraper will extract details and format them with AI.
                </p>
              </div>

              <Input
                label="Web Page URL"
                type="url"
                required
                placeholder="https://example.org/hackathon-2027"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />

              <Button type="submit" disabled={isIngesting}>
                {isIngesting ? "Scraping & Formatting with AI..." : "Extract Opportunity with AI"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOcrImage} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Extract Opportunity from Notice Poster or Flyer
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload an event flyer, social media announcement graphic, or paste an image URL. Multimodal Gemini OCR will transcribe dates, fees, and requirements.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload Image Flyer (PNG, JPG, WebP)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-slate-400">
                  or provide URL
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <Input
                label="Poster Image URL"
                type="url"
                placeholder="https://example.org/posters/competition.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />

              <Button type="submit" disabled={isIngesting}>
                {isIngesting ? "Running OCR & AI Analysis..." : "Extract with Multimodal OCR"}
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* Extracted Opportunity Review & Approval Card */}
      {extractedDraft && (
        <form onSubmit={handleSaveDraft} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <VerificationBadge isVerified={false} status="unverified" />
              <span className="text-xs text-amber-900 font-medium">
                Extracted via {extractedDraft.source_type.toUpperCase()} · Review before publishing
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setExtractedDraft(null);
                setSourcePreview(null);
              }}
            >
              Start over
            </Button>
          </div>

          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Review AI Extracted Opportunity Details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={extractedDraft.title}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, title: e.target.value })
                }
              />
              <Input
                label="Organizer"
                value={extractedDraft.organizer}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, organizer: e.target.value })
                }
              />
            </div>

            <Textarea
              label="Description (Summary)"
              required
              rows={3}
              value={extractedDraft.description}
              onChange={(e) =>
                setExtractedDraft({ ...extractedDraft, description: e.target.value })
              }
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Category"
                name="type"
                value={extractedDraft.type}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, type: e.target.value })
                }
                options={OPPORTUNITY_TYPES}
              />

              <Select
                label="Subject Area"
                name="subject_area"
                value={extractedDraft.subject_area}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, subject_area: e.target.value })
                }
                options={SUBJECT_AREAS}
              />

              <Input
                label="Application Deadline (YYYY-MM-DD)"
                type="date"
                value={extractedDraft.deadline || ""}
                onChange={(e) =>
                  setExtractedDraft({
                    ...extractedDraft,
                    deadline: e.target.value || null,
                  })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Registration Link"
                type="url"
                value={extractedDraft.registration_link}
                onChange={(e) =>
                  setExtractedDraft({
                    ...extractedDraft,
                    registration_link: e.target.value,
                  })
                }
              />
              <Input
                label="Location"
                value={extractedDraft.location}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, location: e.target.value })
                }
              />
              <Input
                label="Participation Cost"
                value={extractedDraft.cost}
                onChange={(e) =>
                  setExtractedDraft({ ...extractedDraft, cost: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Grade / Age Requirements"
                value={extractedDraft.grade_requirements}
                onChange={(e) =>
                  setExtractedDraft({
                    ...extractedDraft,
                    grade_requirements: e.target.value,
                  })
                }
              />
              <Input
                label="Tags (comma separated)"
                value={extractedDraft.tags.join(", ")}
                onChange={(e) =>
                  setExtractedDraft({
                    ...extractedDraft,
                    tags: e.target.value.split(",").map((t) => t.trim().toLowerCase()),
                  })
                }
              />
            </div>

            <Textarea
              label="Eligibility Details"
              rows={2}
              value={extractedDraft.eligibility_details}
              onChange={(e) =>
                setExtractedDraft({
                  ...extractedDraft,
                  eligibility_details: e.target.value,
                })
              }
            />

            <Textarea
              label="Application Steps"
              rows={2}
              value={extractedDraft.application_steps}
              onChange={(e) =>
                setExtractedDraft({
                  ...extractedDraft,
                  application_steps: e.target.value,
                })
              }
            />

            {sourcePreview && (
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <summary className="font-semibold cursor-pointer text-slate-700">
                  Inspect raw extracted source text
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {sourcePreview}
                </pre>
              </details>
            )}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExtractedDraft(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Publishing..."
                  : "Publish to Catalog (Marked as Internet Source)"}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
