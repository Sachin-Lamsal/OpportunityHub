import type { Opportunity } from "@/lib/types";

/**
 * `review_note` is written by administrators and is intended for the owning
 * publisher (it is rendered in the publisher's own listing screens). Public
 * browse and detail queries select `*`, so without this the note would be
 * serialised into every anonymous page payload. Strip it from public reads;
 * owner and admin reads keep it.
 *
 * Pure module (no Supabase / Next imports) so the redaction can be unit tested.
 */
export function withoutInternalNotes(rows: unknown[]): Opportunity[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row as Opportunity;
    const { review_note: _note, ...rest } = row as Opportunity & {
      review_note?: string | null;
    };
    return rest as Opportunity;
  });
}