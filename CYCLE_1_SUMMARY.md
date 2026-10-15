# CYCLE 1: FUNCTIONAL CORRECTNESS - IMPLEMENTATION COMPLETE

## ✅ WHAT'S BEEN BUILT

### Core Infrastructure
- ✅ Complete TypeScript type system for discovery/verification/approval workflow
- ✅ Database migration file (8 new tables with RLS policies)
- ✅ 6 server actions for complete workflow
- ✅ 4 query functions for data retrieval
- ✅ Protected admin dashboard with 4 pages
- ✅ Build passes with no errors

### The Complete Vertical Workflow

```
Discovery Candidate Created
         ↓
Admin Reviews Evidence & Flags
         ↓
Approve or Reject Decision
         ↓
If Approved: Creates Official Opportunity
         ↓
Published Under OpportunityHub Account
         ↓
Appears in Public /opportunities
```

## 📁 FILES CREATED/MODIFIED

### New Files
```
lib/types/discovery.ts                          - TypeScript interfaces
lib/actions/discovery.ts                        - 6 server actions
lib/queries/discovery.ts                        - 4 query functions
app/admin/layout.tsx                            - Protected admin layout
app/admin/dashboard/page.tsx                    - Overview dashboard
app/admin/queue/page.tsx                        - Approval queue list
app/admin/candidate/[id]/page.tsx               - Candidate review
supabase/migration-discovery-verification-system.sql - Database schema
```

### Modified Files
None - all new code, no breaking changes

## 🗄️ DATABASE SCHEMA (TO APPLY)

8 new tables:
1. `admin_roles` - Admin/moderator assignments
2. `discovery_candidates` - Raw discovered opportunities
3. `verification_evidence` - Supporting/contradicting evidence
4. `risk_flags` - Suspicious markers (fraud, unverified organizer, etc)
5. `approval_queue` - Workflow tracking
6. `audit_events` - Immutable action log
7. `discovery_sources` - Source registry
8. `discovery_jobs` - Scan history

All with proper RLS policies, indexes, and constraints.

## 🔑 SETUP REQUIRED (You Do This)

### 1. Apply Database Migration (5 minutes)
```
Go to: https://app.supabase.com/project/[YOUR_PROJECT]/sql/new
Copy entire contents of: supabase/migration-discovery-verification-system.sql
Paste into SQL editor
Click "Run"
```

### 2. Create Official Publisher Account (2 minutes)
```sql
-- In Supabase SQL Editor:
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('system+opportunityhub@opportunityhub.app', 'SKIP_VERIFICATION', now())
RETURNING id;

-- Copy the UUID returned above, then:
INSERT INTO public.profiles (id, email, account_type, publisher_type)
VALUES ('PASTE_UUID_HERE', 'system+opportunityhub@opportunityhub.app', 'organization', 'official');
```

### 3. Give Yourself Admin Role (1 minute)
```sql
-- Get your UUID from Auth → Users in Supabase dashboard
-- Then run:
INSERT INTO public.admin_roles (user_id, role)
VALUES ('YOUR_UUID_HERE', 'admin');
```

### 4. Start Dev Server (if not running)
```bash
npm run dev
# Visit http://localhost:3000
```

## 🧪 TEST CYCLE 1 (10-15 minutes)

### Test 1: Build Status
```bash
npm run build
# Should show: ✓ Compiled successfully
```

### Test 2: Admin Access
1. Log in as yourself to OpportunityHub
2. Visit http://localhost:3000/admin/dashboard
3. Should see admin dashboard (NOT redirect to login)

### Test 3: Create Test Candidate (via Supabase SQL)
```sql
INSERT INTO discovery_candidates (
  original_url, title, organizer, deadline, description, status
) VALUES (
  'https://example.com/science-olympiad',
  'National Science Olympiad 2026',
  'National Science Board',
  '2026-12-15',
  'Annual science competition for secondary students',
  'new'
);

-- Copy the ID returned, use it below
```

### Test 4: Add to Approval Queue
```sql
INSERT INTO approval_queue (candidate_id, status)
VALUES ('PASTE_CANDIDATE_ID_HERE', 'pending');
```

### Test 5: View in Admin Queue
1. Visit http://localhost:3000/admin/queue
2. Should see "Test Science Olympiad" listed
3. Click "Review"

### Test 6: Add Verification Evidence
On the candidate page, you should see:
- Candidate details
- Evidence section (empty)
- Risk flags section (empty)

To add evidence via Supabase:
```sql
INSERT INTO verification_evidence (
  candidate_id, claim, evidence_type, verdict, source_url
) VALUES (
  'CANDIDATE_ID',
  'This is a real competition run by the National Science Board',
  'organizer_official',
  'supports',
  'https://example.com/about'
);
```

### Test 7: Add Risk Flag
```sql
INSERT INTO risk_flags (candidate_id, flag_type, severity, description)
VALUES (
  'CANDIDATE_ID',
  'low_confidence',
  'low',
  'Deadline format needs verification'
);
```

### Test 8: Approve Candidate (the critical test)
1. On candidate page, click "Approve" button
2. Check that:
   - A new opportunity appears in `/opportunities`
   - Candidate status changes to 'approved'
   - An audit event is created

```sql
-- Verify in Supabase:
SELECT * FROM discovery_candidates WHERE id = 'CANDIDATE_ID';
-- Should show status: 'approved'

SELECT * FROM opportunities WHERE source_type = 'official' ORDER BY created_at DESC LIMIT 1;
-- Should see the new opportunity
```

### Test 9: Check Audit Trail
```sql
SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10;
-- Should show: discover, verify, flag, approve actions
```

## 📊 CYCLE 1 RESULTS

Running these tests will verify:
- ✅ Database schema is correct
- ✅ Admin authentication works
- ✅ Complete approval workflow functions
- ✅ Official opportunities are created correctly
- ✅ Audit logging captures all actions
- ✅ RLS policies protect sensitive data

## 🎯 SUCCESS CRITERIA

All tests pass if:
1. Build succeeds
2. Admin dashboard loads
3. Candidates appear in queue
4. Evidence/flags display correctly
5. Approving candidate creates official opportunity
6. Audit trail records all actions

## 📝 KNOWN LIMITATIONS (Cycle 1)

- Discovery is manual only (no automated crawlers yet)
- Verification is manual (no automatic claim checking yet)
- Recommendations not yet implemented
- Risk flagging is manual (no auto-detection yet)

These will be added in Cycles 2-3.

## 🔄 IF SOMETHING FAILS

1. Check build errors: `npm run build`
2. Verify migration ran: Check Supabase SQL Editor history
3. Verify admin role exists: `SELECT * FROM admin_roles`
4. Check TypeScript: `tsc --noEmit`
5. Check RLS policies: Supabase Dashboard → Authentication → Policies

---

**Status**: Ready for manual testing
**Next**: Once you confirm tests pass, I'll move to Cycle 2 (automated discovery + verification)
