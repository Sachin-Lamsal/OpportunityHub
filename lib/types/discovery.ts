/**
 * Discovery, Verification, and Approval System Types
 */

export interface DiscoveryCandidate {
  id: string;
  source_id: string | null;
  original_url: string;
  title: string;
  description: string | null;
  organizer: string | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  is_online: boolean | null;
  subject_area: string | null;
  grade_requirements: string | null;
  cost: string | null;
  contact_info: string | null;
  registration_link: string | null;
  status: 'new' | 'processing' | 'verification_pending' | 'approved' | 'rejected' | 'archived';
  duplicate_of_id: string | null;
  extraction_confidence: number | null;
  processing_notes: string | null;
  raw_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationEvidence {
  id: string;
  candidate_id: string;
  claim: string;
  evidence_type: 'organizer_official' | 'website' | 'third_party' | 'social_media' | 'search_result' | 'other';
  source_url: string | null;
  source_title: string | null;
  evidence_excerpt: string | null;
  verdict: 'supports' | 'contradicts' | 'neutral' | 'inconclusive';
  confidence: number | null;
  retrieved_at: string;
  notes: string | null;
  created_at: string;
}

export interface RiskFlag {
  id: string;
  candidate_id: string;
  flag_type: 'missing_deadline' | 'suspicious_url' | 'organizer_unverified' | 'contradicted_claim' | 'potential_fraud' | 'expired' | 'duplicate' | 'low_confidence' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggested_action: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface ApprovalQueueItem {
  id: string;
  candidate_id: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
  assigned_to: string | null;
  priority: number;
  review_notes: string | null;
  reviewer_id: string | null;
  decision_at: string | null;
  unresolved_flags_count: number;
  created_at: string;
  updated_at: string;
  candidate?: DiscoveryCandidate;
}

export interface AuditEvent {
  id: string;
  action: 'discover' | 'extract' | 'verify' | 'flag' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'edit' | 'remove' | 'resolve_flag' | 'admin_login' | 'other';
  actor_id: string | null;
  actor_type: 'admin' | 'system' | 'student' | 'school' | 'organization' | null;
  target_type: 'candidate' | 'opportunity' | 'flag' | 'source' | 'verification' | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface DiscoverySource {
  id: string;
  name: string;
  source_type: 'website' | 'rss' | 'facebook' | 'search' | 'user_submitted' | 'other';
  base_url: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  last_scan_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'superadmin';
  created_at: string;
  notes: string | null;
}
