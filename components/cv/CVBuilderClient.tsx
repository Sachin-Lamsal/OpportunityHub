"use client";

import { useState, useTransition } from "react";
import { enhanceCVWithAI } from "@/lib/actions/ai";
import type { AICVEnhancement } from "@/lib/ai/prompts";
import type { CVData } from "@/lib/cv/generate";
import CVPreview from "@/components/cv/CVPreview";
import Button from "@/components/ui/Button";

interface CVBuilderClientProps {
  cv: CVData;
  hasActivities: boolean;
}

export default function CVBuilderClient({
  cv,
  hasActivities,
}: CVBuilderClientProps) {
  const [enhancement, setEnhancement] = useState<AICVEnhancement | null>(null);
  const [source, setSource] = useState<"ai" | "fallback">("fallback");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleEnhance() {
    startTransition(async () => {
      const result = await enhanceCVWithAI();
      setEnhancement(result.data);
      setSource(result.source);
      setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {hasActivities && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleEnhance}
            disabled={isPending}
          >
            {isPending ? "Enhancing with AI…" : "Enhance with AI (optional)"}
          </Button>
          <p className="text-sm text-slate-500">
            AI adds a summary and bullet points from your stored activities only.
          </p>
        </div>
      )}

      <CVPreview
        cv={cv}
        aiEnhancement={enhancement}
        aiSource={source}
        aiError={error}
      />
    </div>
  );
}
