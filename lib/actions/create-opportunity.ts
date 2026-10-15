"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/auth/account";
import type { AccountType } from "@/lib/types";
import { OPPORTUNITY_TYPES, SUBJECT_AREAS } from "@/lib/constants";
import { isSubmissionIntent } from "@/lib/opportunities/workflow";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";
import { formatOpportunityInsertError } from "@/lib/utils/supabase-errors";

export interface CreateOpportunityState {
  error?: string;
  success?: string;
  redirectTo?: string;
}

interface PublisherContext {
  id: string;
  accountType: Extract<AccountType, "school" | "organization">;
  organizer: string;
}

interface OpportunityFields {
  title: string;
  type: string;
  description: string;
  registration_link: string | null;
  source_url: string | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  is_online: boolean;
  subject_area: string | null;
  grade_requirements: string | null;
  eligibility_details: string | null;
  application_steps: string | null;
  cost: string | null;
}

function dashboardPath(accountType: PublisherContext["accountType"]): string {
  return accountType === "school" ? "/school/dashboard" : "/org/dashboard";
}

function publisherPath(context: PublisherContext): string {
  return context.accountType === "school" ? `/school/${context.id}` : `/org/${context.id}`;
}

function textValue(formData: FormData, field: string): string | null {
  return (formData.get(field) as string | null)?.trim() || null;
}

async function getPublisherContext(): Promise<
  { context: PublisherContext } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, organization_name")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;
  if (accountType !== "school" && accountType !== "organization") {
    return { error: "Only schools and organizations can manage opportunities." };
  }

  return {
    context: {
      id: user.id,
      accountType,
      organizer:
        profile?.organization_name?.trim() ||
        (accountType === "school" ? "School" : "Organization"),
    },
  };
}

function parseOpportunityFields(
  formData: FormData,
): { fields: OpportunityFields; intent: "draft" | "review" } | { error: string } {
  const title = textValue(formData, "title");
  const type = textValue(formData, "type");
  const description = textValue(formData, "description");
  const intentValue = formData.get("submission_intent");
  const intent = isSubmissionIntent(intentValue) ? intentValue : "draft";

  if (!title || !description) {
    return { error: "Title and description are required, even for a draft." };
  }

  if (!type || !OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number])) {
    return { error: "Please choose a valid opportunity type." };
  }

  const subjectArea = textValue(formData, "subject_area");
  if (subjectArea && !SUBJECT_AREAS.includes(subjectArea as (typeof SUBJECT_AREAS)[number])) {
    return { error: "Please select a valid subject area." };
  }

  const rawRegistrationLink = textValue(formData, "registration_link");
  const rawSourceUrl = textValue(formData, "source_url");
  const registrationLink = rawRegistrationLink
    ? sanitizeRegistrationUrl(rawRegistrationLink)
    : null;
  const sourceUrl = rawSourceUrl ? sanitizeRegistrationUrl(rawSourceUrl) : null;

  if (rawRegistrationLink && !registrationLink) {
    return { error: "Please enter a valid registration website address." };
  }

  if (rawSourceUrl && !sourceUrl) {
    return { error: "Please enter a valid official source website address." };
  }

  if (intent === "review" && !registrationLink && !sourceUrl) {
    return {
      error: "Add an official source or registration link before submitting this listing for review.",
    };
  }

  const startDate = textValue(formData, "start_date");
  const endDate = textValue(formData, "end_date");
  if (startDate && endDate && endDate < startDate) {
    return { error: "The end date cannot be before the start date." };
  }

  return {
    intent,
    fields: {
      title,
      type,
      description,
      registration_link: registrationLink,
      source_url: sourceUrl,
      deadline: textValue(formData, "deadline"),
      start_date: startDate,
      end_date: endDate,
      location: textValue(formData, "location"),
      is_online: formData.get("is_online") === "on",
      subject_area: subjectArea,
      grade_requirements: textValue(formData, "grade_requirements"),
      eligibility_details: textValue(formData, "eligibility_details"),
      application_steps: textValue(formData, "application_steps"),
      cost: textValue(formData, "cost"),
    },
  };
}

function revalidatePublisherViews(context: PublisherContext, opportunityId?: string) {
  revalidatePath("/opportunities");
  revalidatePath(dashboardPath(context.accountType));
  revalidatePath(publisherPath(context));
  revalidatePath("/admin/publisher-review");
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createOpportunity(
  _prevState: CreateOpportunityState,
  formData: FormData,
): Promise<CreateOpportunityState> {
  const publisher = await getPublisherContext();
  if ("error" in publisher) return { error: publisher.error };

  const parsed = parseOpportunityFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const parentOpportunityId = textValue(formData, "parent_opportunity_id");
  const editionYear = textValue(formData, "edition_year");

  if (parentOpportunityId && !UUID_RE.test(parentOpportunityId)) {
    return { error: "The selected parent opportunity is invalid." };
  }

  if (parentOpportunityId) {
    const { data: parent } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", parentOpportunityId)
      .eq("created_by", publisher.context.id)
      .maybeSingle();

    if (!parent) {
      return { error: "You can only create a new edition from one of your own opportunities." };
    }
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      ...parsed.fields,
      organizer: publisher.context.organizer,
      created_by: publisher.context.id,
      source_type: "manual",
      lifecycle_status: parsed.intent === "review" ? "pending_review" : "draft",
      is_verified: false,
      verification_status: "unverified",
      parent_opportunity_id: parentOpportunityId,
      edition_year: editionYear,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: formatOpportunityInsertError(
        `${error.message} — run supabase/migration-publisher-workflows.sql if this database has not been updated yet.`,
      ),
    };
  }

  revalidatePublisherViews(publisher.context, data.id);

  return {
    success:
      parsed.intent === "review"
        ? "Listing submitted for review. It will appear publicly after approval."
        : "Draft saved. You can submit it for review when the details are ready.",
    redirectTo: dashboardPath(publisher.context.accountType),
  };
}

export async function updateOpportunity(
  _prevState: CreateOpportunityState,
  formData: FormData,
): Promise<CreateOpportunityState> {
  const publisher = await getPublisherContext();
  if ("error" in publisher) return { error: publisher.error };

  const opportunityId = textValue(formData, "opportunity_id");
  if (!opportunityId || !UUID_RE.test(opportunityId)) {
    return { error: "A valid opportunity is required." };
  }

  const parsed = parseOpportunityFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .update({
      ...parsed.fields,
      lifecycle_status: parsed.intent === "review" ? "pending_review" : "draft",
      review_note: null,
    })
    .eq("id", opportunityId)
    .eq("created_by", publisher.context.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: `Failed to save listing: ${error.message}` };
  }

  if (!data) {
    return { error: "This listing could not be found or is no longer managed by your account." };
  }

  revalidatePublisherViews(publisher.context, opportunityId);

  return {
    success:
      parsed.intent === "review"
        ? "Your updated listing was submitted for review."
        : "Draft saved.",
    redirectTo: dashboardPath(publisher.context.accountType),
  };
}

export async function setOpportunityLifecycle(
  opportunityId: string,
  lifecycleStatus: "cancelled" | "archived",
): Promise<{ error?: string; success?: string }> {
  const publisher = await getPublisherContext();
  if ("error" in publisher) return { error: publisher.error };

  if (!UUID_RE.test(opportunityId)) return { error: "The listing ID is invalid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ lifecycle_status: lifecycleStatus })
    .eq("id", opportunityId)
    .eq("created_by", publisher.context.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Unable to update listing status: ${error.message}` };
  if (!data) return { error: "This listing could not be found or is no longer managed by your account." };

  revalidatePublisherViews(publisher.context, opportunityId);
  return { success: lifecycleStatus === "cancelled" ? "Listing cancelled." : "Listing archived." };
}

export async function deleteOpportunity(
  opportunityId: string,
): Promise<{ error?: string; success?: string }> {
  const publisher = await getPublisherContext();
  if ("error" in publisher) return { error: publisher.error };

  if (!UUID_RE.test(opportunityId)) return { error: "The listing ID is invalid." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("opportunities")
    .select("lifecycle_status")
    .eq("id", opportunityId)
    .eq("created_by", publisher.context.id)
    .maybeSingle();

  if (!listing) return { error: "This listing could not be found." };
  if (!["draft", "rejected", "cancelled"].includes(listing.lifecycle_status ?? "draft")) {
    return { error: "Published and archived listings are retained as history. Archive the listing instead." };
  }

  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", opportunityId)
    .eq("created_by", publisher.context.id);

  if (error) return { error: `Failed to delete listing: ${error.message}` };

  revalidatePublisherViews(publisher.context, opportunityId);
  return { success: "Listing deleted." };
}
