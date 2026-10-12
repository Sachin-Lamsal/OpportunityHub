import type {
  ACCOUNT_TYPES,
  ACTIVITY_CATEGORIES,
  EDUCATION_LEVELS,
} from "./constants";

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface Profile {
  id: string;
  email: string;
  account_type: AccountType;
  organization_name: string | null;
  school_code: string | null;
  school_id: string | null;
  school_name?: string | null;
  contact_info: string | null;
  organization_description: string | null;
  students_invite_only: boolean;
  education_level: EducationLevel | null;
  dream_universities: string | null;
  subjects: string | null;
  interests: string | null;
  career_interests: string | null;
  awards: string | null;
  volunteer_work: string | null;
  leadership_roles: string | null;
  projects: string | null;
  email_reminders?: boolean;
  newsletter_subscribed?: boolean;
  onboarding_completed?: boolean;
  intended_major?: string | null;
  created_at: string;
}

export type VerificationStatus = "unverified" | "verified" | "rejected";
export type SourceType = "official" | "scraped" | "ocr" | "manual";

export interface Opportunity {
  id: string;
  title: string;
  type: string;
  description: string;
  organizer: string | null;
  registration_link: string | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  is_online: boolean | null;
  subject_area: string | null;
  grade_requirements: string | null;
  cost: string | null;
  time_commitment: string | null;
  skills_gained: string | null;
  difficulty_level: string | null;
  tags: string[] | null;
  prep_resources: string | null;
  application_steps: string | null;
  eligibility_details: string | null;
  contact_info: string | null;
  ai_summary: string | null;
  portfolio_tips: string | null;
  ai_enriched_at: string | null;
  source_url: string | null;
  parent_opportunity_id?: string | null;
  edition_year?: string | null;
  is_verified?: boolean;
  verification_status?: VerificationStatus;
  source_type?: SourceType;
  raw_source_text?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SchoolInviteCode {
  id: string;
  school_id: string;
  code: string;
  label: string | null;
  max_uses: number;
  use_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface SchoolStudentSummary {
  id: string;
  email: string;
  education_level: EducationLevel | null;
  dream_universities: string | null;
  activity_count: number;
  last_activity_date: string | null;
}

export interface Activity {
  id: string;
  user_id: string;
  opportunity_id?: string | null;
  title: string;
  category: ActivityCategory;
  description: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface SavedOpportunity {
  id: string;
  user_id: string;
  opportunity_id: string;
  remind_deadline?: boolean;
  reminder_sent_at?: string | null;
  created_at: string;
}

export interface OpportunityComment {
  id: string;
  opportunity_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user_email?: string;
  account_type?: AccountType;
  organization_name?: string | null;
}

export interface OpportunityReview {
  id: string;
  opportunity_id: string;
  user_id: string;
  difficulty_rating: "Beginner" | "Intermediate" | "Advanced" | "Challenging" | null;
  prep_tips: string;
  common_mistakes: string | null;
  skills_developed: string | null;
  verified_participant: boolean;
  created_at: string;
  user_email?: string;
}

export interface OrganizationFollow {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
}


