# OpportunityHub Feature Improvements Plan

Branch: pathced-notes | Date: 2026-10-22

Status legend: **Implemented + tested** / Implemented, manual check needed / Not started / Skipped

## Review of existing functionality
- Student dashboard, portfolio, CV builder, AI suggestions, saved opportunities
- School/Org dashboards, opportunity creation/editing with draft/pending/published workflow
- Opportunity discovery with filters (subject/type/deadline/format), search
- Auth with role-based routing, onboarding for students
- Community (comments/reviews), publisher profiles
- Admin panels

## Tier 1 - High impact, low risk

| # | Improvement | Status | Where |
|---|---|---|---|
| 1 | Breadcrumbs on deeper pages | Implemented + tested | `components/layout/Breadcrumbs.tsx`, wired into 19 pages (opportunity detail/edit/new, browse, portfolio, profile, CV builder, AI advisor, saved, school, org, admin) |
| 2 | Visible active-filter indicators | Implemented + tested | `components/opportunities/OpportunityFilters.tsx` — removable chips, one-click removal, "Clear all" keeps the chosen sort |
| 3 | Empty states with CTAs | Implemented + tested | `components/ui/States.tsx` `EmptyState` now used by `OpportunityList`, `ActivityList`, `PublisherOpportunityList` and the new saved page |
| 4 | Confirmation for destructive actions | Already present, kept | Delete/ cancel/ archive in `PublisherOpportunityList` already confirm; added success/error feedback with `aria-live` |
| 5 | Buttons disabled during submission | Already present, kept | `useActionState` `pending` + `useTransition` `isPending` drive the disabled states |
| 6 | Profile completion indicator | Implemented + tested | `lib/profile/completion.ts`, `components/profile/ProfileCompletionCard.tsx`, shown on the student dashboard |

## Tier 2 - Good UX improvements

| # | Improvement | Status | Where |
|---|---|---|---|
| 7 | Sort options for the browse list | Implemented + tested | `lib/opportunities/filters.ts`, `lib/constants.ts` (`OPPORTUNITY_SORT_OPTIONS`), server-side ordering in `lib/queries/opportunities.ts` |
| 8 | Saved opportunities page | Implemented + tested | `app/(app)/saved/page.tsx` — real saved rows grouped into open / deadline passed / no longer available, nav entry added, `revalidatePath("/saved")` after save and unsave |
| 9 | Related opportunities on the detail page | Implemented + tested | `getRelatedOpportunities()` in `lib/queries/opportunities.ts` — same subject area, then same type; still-open listings first |
| 10 | Mobile nav responsiveness | Already decent, minor tweak | Nav collapses under `md`; a "Saved" entry was added to the student nav |
| 11 | Focus states / accessibility | Implemented, manual check needed | `role="status"` live regions, `aria-current` breadcrumbs, `progressbar` semantics, keyboard-reachable chips, `aria-hidden` decorative icons |
| 12 | Loading skeletons | Already present, kept | `FiltersSkeleton` and the `Skeleton`/`CardSkeleton`/`ListSkeleton` helpers |

## Tier 3 - Nice to have

| # | Improvement | Status | Where |
|---|---|---|---|
| 13 | Copy link button on the detail page | Implemented, manual check needed | `components/opportunities/CopyLinkButton.tsx` — Clipboard API with a `execCommand` fallback, copies the clean page address |
| 14 | "Back to results" preservation | Implemented + tested | The browse query travels in the card links, the detail page builds its back link from it, and `?from=saved` returns to the saved list |
| 15 | Application notes / reminders | Partly already present | The `remind_deadline` flag and the deadline reminder cron already exist; deadline state is now visible on cards and details. No new data model was added |

## Additional work carried out during the review cycles

- Deadline helpers (`lib/opportunities/deadline.ts`): past / closing soon / days remaining, used by cards, detail page and the saved list.
- Unsaved-change guard (`components/ui/useUnsavedChangesGuard.ts`) on the opportunity and activity forms: browser `beforeunload` plus a capture-phase document click listener so in-app link navigation is warned about too. The guard is released as soon as a save succeeds.
- Search box debounced by 450 ms; the dropdowns still use the explicit "Apply filters" button so a request is made once per intent.
- "Applications closed" / "Closing soon" badges on cards and banners on the detail page.
- CV preview can be downloaded as a `.txt` file.
- Internal admin notes (`review_note`) are stripped from the saved-list and curated-section queries, so they are no longer serialised into student-facing page payloads.

## Implementation approach
- Reuse existing components (Button, Card, States, Input, Select, Textarea)
- Follow existing patterns (server actions, useActionState, query helpers)
- Minimal changes, test after each
- No new dependencies, no database migration

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm test` — 149 passing, 0 failing
- `npm run build` — succeeds, `/saved` registered as a dynamic route

Not verified: live database flows (saved list, related opportunities, profile completion) and browser-only behaviour (clipboard, unsaved-change prompts, debounce timing, responsive layout). The local `.env.local` holds a placeholder Supabase publishable key.
