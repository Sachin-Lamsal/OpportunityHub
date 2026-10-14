"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageOpportunities } from "@/lib/auth/account";
import type { AccountType } from "@/lib/types";
import { getScraper } from "@/lib/ingestion/scraper";
import { extractTextFromImage } from "@/lib/ingestion/ocr";
import {
  formatRawTextToOpportunity,
  type OpportunityDraft,
} from "@/lib/ingestion/formatter";
import { formatOpportunityInsertError } from "@/lib/utils/supabase-errors";

export interface IngestResponse {
  success: boolean;
  draft?: OpportunityDraft;
  error?: string;
  sourceTextPreview?: string;
}

/**
 * Guards the ingestion helpers.
 *
 * These are exported server actions, so the page-level `canManageOpportunities`
 * check on /opportunities/ingest does NOT protect them — any authenticated
 * user could invoke them directly. They also trigger paid Gemini calls, so they
 * must be restricted to publisher accounts before any work is done.
 */
async function requirePublisherAccount(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to ingest opportunities.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!canManageOpportunities(profile?.account_type as AccountType | undefined)) {
    return {
      ok: false,
      error: "Only schools and organizations can ingest new opportunities.",
    };
  }

  return { ok: true, userId: user.id };
}

/**
 * Scrapes a public web page, extracts content, and uses AI to format it into an opportunity.
 */
export async function ingestFromUrl(url: string): Promise<IngestResponse> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { success: false, error: "Please provide a valid web URL." };
  }

  const publisher = await requirePublisherAccount();
  if (!publisher.ok) {
    return { success: false, error: publisher.error };
  }

  try {
    const scraper = getScraper();
    const scraped = await scraper.scrape(trimmedUrl);

    if (!scraped.content || scraped.content.length < 50) {
      return {
        success: false,
        error:
          "Scraped page returned very little text. The page may require JavaScript or block automated access.",
      };
    }

    // If an og:image exists and page text is short, try OCR on the poster image as enrichment
    let combinedText = scraped.content;
    const candidateImage = scraped.images[0];
    if (scraped.content.length < 300 && candidateImage) {
      const ocr = await extractTextFromImage({ imageUrl: candidateImage, userId: publisher.userId });
      if (ocr.text) {
        combinedText += `\n\n[OCR from Poster Image]:\n${ocr.text}`;
      }
    }

    const draft = await formatRawTextToOpportunity({
      rawText: combinedText,
      sourceUrl: trimmedUrl,
      sourceType: "scraped",
      pageTitle: scraped.title,
      userId: publisher.userId,
    });

    return {
      success: true,
      draft,
      sourceTextPreview: combinedText.slice(0, 1000),
    };
  } catch (err) {
    return {
      success: false,
      error: `Scraping error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Extracts text from an uploaded image flyer/poster using Gemini OCR,
 * then formats it into a structured opportunity draft.
 */
export async function ingestFromImage(formData: FormData): Promise<IngestResponse> {
  const publisher = await requirePublisherAccount();
  if (!publisher.ok) {
    return { success: false, error: publisher.error };
  }

  const file = formData.get("file") as File | null;
  const imageUrl = (formData.get("image_url") as string)?.trim();

  // SECURITY: File upload validation
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (file && file.size > 0) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Image file too large. Maximum size is 5MB (you uploaded ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
      };
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Invalid image format. Please upload JPEG, PNG, WebP, or GIF (you uploaded ${file.type || "unknown"}).`,
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Use btoa for Edge Runtime compatibility
    let imageBase64 = "";
    for (let i = 0; i < bytes.length; i++) {
      imageBase64 += String.fromCharCode(bytes[i]);
    }
    imageBase64 = btoa(imageBase64);
    const mimeType = file.type;

    if (!imageBase64 && !imageUrl) {
      return {
        success: false,
        error: "Please upload an image file or provide an image URL.",
      };
    }

    try {
      const ocrResult = await extractTextFromImage({
        imageUrl,
        imageBase64,
        mimeType,
        userId: publisher.userId,
      });

      if (ocrResult.error || !ocrResult.text) {
        return {
          success: false,
          error: ocrResult.error || "No readable text could be extracted from this image.",
        };
      }

      const draft = await formatRawTextToOpportunity({
        rawText: ocrResult.text,
        sourceUrl: imageUrl || "",
        sourceType: "ocr",
        userId: publisher.userId,
        pageTitle: "Extracted Notice Poster",
      });

      return {
        success: true,
        draft,
        sourceTextPreview: ocrResult.text.slice(0, 1000),
      };
    } catch (err) {
      return {
        success: false,
        error: `OCR processing error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  if (!imageUrl) {
    return {
      success: false,
      error: "Please upload an image file or provide an image URL.",
    };
  }

  try {
    const ocrResult = await extractTextFromImage({
      imageUrl,
      userId: publisher.userId,
    });

    if (ocrResult.error || !ocrResult.text) {
      return {
        success: false,
        error: ocrResult.error || "No readable text could be extracted from this image.",
      };
    }

    const draft = await formatRawTextToOpportunity({
      rawText: ocrResult.text,
      sourceUrl: imageUrl,
      sourceType: "ocr",
      userId: publisher.userId,
      pageTitle: "Extracted Notice Poster",
    });

    return {
      success: true,
      draft,
      sourceTextPreview: ocrResult.text.slice(0, 1000),
    };
  } catch (err) {
    return {
      success: false,
      error: `OCR processing error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Saves an ingested opportunity draft into the database with verification_status = 'unverified'.
 */
export async function saveIngestedOpportunity(
  draft: OpportunityDraft,
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to save opportunities to the database.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;
  if (!canManageOpportunities(accountType)) {
    return {
      success: false,
      error: "Only schools and organizations can ingest new opportunities.",
    };
  }

  const insertData = {
    title: draft.title,
    type: draft.type,
    description: draft.description,
    organizer: draft.organizer || null,
    registration_link: draft.registration_link || null,
    deadline: draft.deadline || null,
    start_date: draft.start_date || null,
    end_date: draft.end_date || null,
    location: draft.location || null,
    is_online: draft.is_online,
    subject_area: draft.subject_area || null,
    grade_requirements: draft.grade_requirements || null,
    cost: draft.cost || null,
    time_commitment: draft.time_commitment || null,
    skills_gained: draft.skills_gained || null,
    difficulty_level: draft.difficulty_level || null,
    tags: draft.tags || [],
    application_steps: draft.application_steps || null,
    eligibility_details: draft.eligibility_details || null,
    contact_info: draft.contact_info || null,
    source_url: draft.source_url || null,
    is_verified: false,
    verification_status: "unverified",
    source_type: draft.source_type,
    raw_source_text: draft.raw_source_text || null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("opportunities")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: formatOpportunityInsertError(error.message),
    };
  }

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  revalidatePath("/org/dashboard");
  return { success: true, opportunityId: data.id };
}

/**
 * Verifies an opportunity (marks is_verified = true).
 * Accessible by schools and organizations.
 */
export async function verifyOpportunityAction(
  opportunityId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to verify listings." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;
  if (!canManageOpportunities(accountType)) {
    return {
      success: false,
      error: "Only schools and organizations can verify opportunities.",
    };
  }

  const { error } = await supabase.rpc("verify_opportunity", {
    opp_id: opportunityId,
  });

  if (error) {
    const msg =
      error.message.includes("not the publisher") ||
      error.message.includes("you are not the publisher")
        ? "You can only verify listings published by your account."
        : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/org/dashboard");
  return { success: true };
}

/**
 * Rejects an unverified opportunity.
 */
export async function rejectOpportunityAction(
  opportunityId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to review listings." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;
  if (!canManageOpportunities(accountType)) {
    return {
      success: false,
      error: "Only schools and organizations can reject opportunities.",
    };
  }

  const { error } = await supabase.rpc("reject_opportunity", {
    opp_id: opportunityId,
  });

  if (error) {
    const msg =
      error.message.includes("not the publisher") ||
      error.message.includes("you are not the publisher")
        ? "You can only reject listings published by your account."
        : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: true };
}
