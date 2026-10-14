"use client";

import { type ReactNode, useState } from "react";
import type { CVData } from "@/lib/cv/generate";
import { cvToPlainText } from "@/lib/cv/generate";
import type { AICVEnhancement } from "@/lib/ai/prompts";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface CVPreviewProps {
  cv: CVData;
  aiEnhancement?: AICVEnhancement | null;
  aiSource?: "ai" | "fallback";
  aiError?: string;
}

export default function CVPreview({
  cv,
  aiEnhancement,
  aiSource,
  aiError,
}: CVPreviewProps) {
  const [copied, setCopied] = useState(false);
  const plainText = cvToPlainText(cv);

  const enhancedText = aiEnhancement
    ? [
        cv.name.toUpperCase(),
        cv.email,
        "",
        "SUMMARY",
        aiEnhancement.summary,
        "",
        "KEY HIGHLIGHTS",
        ...aiEnhancement.bulletPoints.map((b) => `• ${b}`),
        "",
        plainText,
      ].join("\n")
    : plainText;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(enhancedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy. Please select the text manually.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy CV to clipboard"}
        </Button>
      </div>

      {aiError && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          {aiError}
        </p>
      )}

      {aiEnhancement && aiSource === "ai" && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            AI-enhanced summary
          </p>
          <p className="mt-2 text-sm text-slate-700">{aiEnhancement.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {aiEnhancement.bulletPoints.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Review and edit before using — AI assists only, based on your stored data.
          </p>
        </Card>
      )}

      <Card className="font-mono text-sm leading-relaxed">
        <div className="border-b border-slate-200 pb-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">{cv.name}</h2>
          <p className="mt-1 text-slate-600">{cv.email}</p>
          {cv.educationLevel && (
            <p className="mt-1 text-slate-600">{cv.educationLevel}</p>
          )}
          {cv.dreamUniversity && (
            <p className="text-slate-500">Target: {cv.dreamUniversity}</p>
          )}
        </div>

        {cv.subjects && (
          <CVSection title="Subjects">
            <p className="text-slate-700">{cv.subjects}</p>
          </CVSection>
        )}

        {cv.careerInterests && (
          <CVSection title="Career interests">
            <p className="text-slate-700">{cv.careerInterests}</p>
          </CVSection>
        )}

        {cv.interests && (
          <CVSection title="Interests">
            <p className="text-slate-700">{cv.interests}</p>
          </CVSection>
        )}

        {cv.sections.length === 0 ? (
          <p className="mt-6 text-center text-slate-500">
            No activities yet. Add activities in your portfolio to build your CV.
          </p>
        ) : (
          cv.sections.map((section) => (
            <CVSection key={section.category} title={section.category}>
              <ul className="space-y-4">
                {section.entries.map((entry) => (
                  <li key={`${entry.title}-${entry.date}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {entry.title}
                      </span>
                      <span className="text-xs text-slate-500">{entry.date}</span>
                    </div>
                    <p className="mt-1 text-slate-700">{entry.description}</p>
                    {entry.notes && (
                      <p className="mt-1 text-xs italic text-slate-500">
                        {entry.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CVSection>
          ))
        )}
      </Card>
    </div>
  );
}

function CVSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide text-slate-800">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
