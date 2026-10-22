-- OpportunityHub: curated student opportunity import
-- Reviewed: 2026-10-22
--
-- HOW TO USE
-- 1. Replace the email address in exactly one place below with the email of
--    the existing OpportunityHub account that should own these submissions.
-- 2. In Supabase Dashboard -> SQL Editor, paste this entire file and click Run.
-- 3. Review the new pending submissions from /admin/publisher-review.
--
-- This script is safe to run again: it will not add another row when its source
-- URL or title is already in public.opportunities. It does not delete old data. Listings
-- whose deadline has passed, or which lack the core information needed to act,
-- are archived so they do not show in the live opportunity feed. A well-
-- documented rolling opportunity is retained even if it has no fixed date.

begin;

-- The SQL Editor is an administrator-only environment. These transaction-local
-- claims let the existing workflow trigger accept the administrator import.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

-- Change this email only. The account must already exist in public.profiles.
do $$
declare
  owner_id uuid;
begin
  select id
    into owner_id
  from public.profiles
  where lower(email) = lower('REPLACE-WITH-YOUR-ACCOUNT-EMAIL@example.com');

  if owner_id is null then
    raise exception 'No profile was found for that email. Create the account first, then replace the email in this script.';
  end if;

  perform set_config('opportunityhub.import_owner_id', owner_id::text, true);
end;
$$;

-- Keep older records for audit/history, but remove them from the student feed.
update public.opportunities
set lifecycle_status = 'expired',
    status_updated_at = now()
where created_by = current_setting('opportunityhub.import_owner_id')::uuid
  and deadline < current_date
  and lifecycle_status in ('draft', 'pending_review', 'published', 'rejected', 'cancelled');

-- Archive records that cannot help a student act: no title/description, no
-- official or registration URL. Undated listings are archived only when they
-- also lack application instructions, so useful rolling opportunities remain.
update public.opportunities
set lifecycle_status = 'archived',
    status_updated_at = now()
where created_by = current_setting('opportunityhub.import_owner_id')::uuid
  and lifecycle_status in ('draft', 'pending_review', 'published', 'rejected', 'cancelled')
  and (
    coalesce(nullif(trim(title), ''), '') = ''
    or coalesce(nullif(trim(description), ''), '') = ''
    or (registration_link is null and source_url is null)
    or (
      deadline is null
      and start_date is null
      and end_date is null
      and coalesce(nullif(trim(application_steps), ''), '') = ''
    )
  );

with listings (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, application_steps, eligibility_details,
  contact_info, source_url
) as (
  values
    (
      'Volunteer at WordCamp Nepal 2027',
      'Volunteering',
      'Volunteer at the two-day WordPress and open-source community event in Nepalgunj. Roles include event operations, attendee support, session assistance, media, communications, sponsor support, and contributor support. Selected volunteers receive event admission, sessions, lunch, and event materials.',
      'WordCamp Nepal 2027 organizing team / WordPress community in Nepal',
      'https://docs.google.com/forms/d/e/1FAIpQLSdmtn8gBJd4M6QvDTzutDa7Mlu1nW8nSS99q4Z0UxKBwqQQ7w/viewform?usp=send_form',
      date '2026-10-31', date '2027-01-29', date '2027-01-30',
      'Siddharth Cottage Restaurant, Nepalgunj, Nepal', false,
      'WordPress, open source, event management, communications, community volunteering',
      'Beginners and people passionate about WordPress are welcome. Confirm any age or guardian-consent requirements directly with the organizer.',
      'No application fee is specified. Travel costs are not specified.',
      'Two event days plus a required pre-event volunteer orientation.',
      'Teamwork, leadership, communication, event coordination, attendee support, and networking.',
      'Beginner-friendly',
      array['volunteering', 'WordPress', 'open source', 'event management', 'Nepalgunj'],
      '1. Submit the official volunteer form by 31 October 2026. 2. Wait for the organizer''s decision. 3. If selected, attend the orientation and complete the assigned role.',
      'No published grade, age, or nationality restriction; check directly with the organizer if you are under 18.',
      null,
      'https://nepal.wordcamp.org/2027/call-for-volunteers/'
    ),
    (
      'Seventh Annual Nepal AI School (ANAIS 2026)',
      'Workshop',
      'An intensive in-person artificial-intelligence programme with lectures, laboratory sessions, and project work. Topics include geometric deep learning, world models, generative modelling, and neuro-symbolic AI.',
      'Nepal Applied Mathematics and Informatics Institute for Research (NAAMII)',
      'https://docs.google.com/forms/d/e/1FAIpQLSdR-Qcu_KObbfCUd1uY9bWu1NWbJHfo905n2QvnHShBix7byw/viewform?usp=send_form',
      date '2026-11-15', date '2026-12-28', date '2027-01-07',
      'Kathmandu World School, Suryabinayak, Bhaktapur, Nepal', false,
      'Artificial intelligence, machine learning, mathematics, computer science, data science, research',
      'Full-time students enrolled in an academic institution may apply. The programme is research-intensive; secondary-school applicants should confirm suitability with the organizer.',
      'Fees vary by category. Limited full or partial fee waivers are available; travel and accommodation are not included unless explicitly awarded.',
      'Full-time in-person programme; at least 80% attendance is required for a certificate.',
      'AI, machine learning, programming, research methods, paper reading, laboratory work, and collaborative problem-solving.',
      'Advanced / research-intensive',
      array['artificial intelligence', 'machine learning', 'STEM', 'research', 'workshop', 'Nepal'],
      '1. Complete the official form. 2. Upload a CV and proof of enrolment. 3. Complete the application questions. 4. Submit by 15 November 2026; Nepal-resident scholarship applicants must apply by 31 October 2026.',
      'Applicants need relevant interest or background in computer science, engineering, mathematics, AI, data science, or a related field.',
      'anais@naamii.org.np',
      'https://nepalschool.naamii.com.np/applications'
    ),
    (
      'UBC International Scholars Program - September 2027 entry',
      'Scholarship',
      'Competitive financial awards for international students entering the University of British Columbia directly from secondary school for their first undergraduate degree. Awards assess academic achievement, leadership or community impact, and significant financial need.',
      'The University of British Columbia',
      'https://undergraduatescholarships.ubc.ca/prog/2027_international_scholars_program_application/',
      date '2026-11-15', null, null,
      'University of British Columbia, Canada', false,
      'Undergraduate study, academic achievement, leadership, community impact, financial aid',
      'Final-year secondary-school students entering directly from an accredited secondary school for a first undergraduate degree.',
      'No separate scholarship application fee is listed. Award value depends on category and assessed financial need.',
      'Applicants also apply to UBC, arrange a school nominator and teacher referee, submit financial information, activities, awards, and essays.',
      'Application writing, leadership reflection, academic planning, and financial-aid documentation.',
      'Highly competitive',
      array['scholarship', 'undergraduate', 'Canada', 'leadership', 'financial aid'],
      '1. Apply for UBC admission. 2. Arrange a school nominator and teacher referee. 3. Complete the scholarship application and financial information. 4. Submit by 15 November 2026 at 11:59 p.m. Pacific time.',
      'International students studying in Canada on a study permit, entering UBC directly from secondary school, with exceptional achievement, leadership, and demonstrated financial need.',
      'international.awards@ubc.ca',
      'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/'
    ),
    (
      'Cliburn International Competition for Young Pianists 2027',
      'Competition',
      'An international piano competition and fully funded in-residence fellowship. The programme includes masterclasses, workshops, artist conversations, and performances in Dallas; selected Piano Fellows may be chosen to compete for prizes.',
      'The Cliburn',
      'https://cliburn.org/competitions/2027-young-pianists/application-and-rules',
      date '2026-11-17', date '2027-06-07', date '2027-06-20',
      'Southern Methodist University and Morton H. Meyerson Symphony Center, Dallas, Texas, USA', false,
      'Classical music, piano performance, musicianship',
      'Open to pianists of all nationalities born after 19 June 2009 and on or before 7 June 2014.',
      'USD 125 non-refundable application fee. Accepted Piano Fellows receive funded housing, meals, transport, and one economy-class round-trip flight.',
      'Prepare a 15-20 minute audition video and attend the full 7-20 June 2027 fellowship if selected.',
      'Piano performance, audition recording, repertoire preparation, musicianship, and live performance.',
      'Advanced',
      array['piano', 'classical music', 'competition', 'performance', 'international'],
      '1. Read the official rules. 2. Prepare the required audition video and materials. 3. Submit the application and fee by 17 November 2026.',
      'Previous first-prize winners of this competition are not eligible. International fellows must obtain any required visa.',
      'Use the contact link on the official rules page.',
      'https://cliburn.org/competitions/2027-young-pianists'
    ),
    (
      'Blue Ocean Student Entrepreneur Competition 2027',
      'Competition',
      'A free global entrepreneurship competition where students identify a problem, develop an original solution, and submit a pitch. Registration includes a mini-course and resources.',
      'Blue Ocean Student Entrepreneur Competition',
      'https://blueoceancompetition.org/register/',
      date '2027-02-21', null, null,
      'Online', true,
      'Entrepreneurship, innovation, business, social enterprise, problem-solving',
      'Students must be enrolled in high school or an equivalent pre-university level. Home-schooled applicants must be ages 14-18.',
      'Free.',
      'Self-paced preparation and pitch development; team submissions are allowed.',
      'Entrepreneurial thinking, innovation, market analysis, business pitching, communication, and teamwork.',
      'Beginner-friendly',
      array['entrepreneurship', 'innovation', 'business', 'pitching', 'online'],
      '1. Register every team member. 2. Complete the mini-course and develop the idea. 3. Follow the official submission requirements before the deadline.',
      'Open worldwide. International teams may include students from different schools or countries; teams may have up to five members.',
      'https://blueoceancompetition.org/contact-us/',
      'https://blueoceancompetition.org/compete/'
    ),
    (
      'Diamond Challenge 2027 - High School Entrepreneurship Competition',
      'Competition',
      'A global entrepreneurship and social-innovation competition run by Horn Entrepreneurship at the University of Delaware. Teams develop original business-innovation or social-innovation concepts and can use a virtual or pre-recorded pitch route.',
      'Horn Entrepreneurship, University of Delaware',
      'https://diamondchallenge.secure-platform.com/a',
      date '2027-01-14', date '2026-09-16', date '2027-04-30',
      'Online / University of Delaware, USA', true,
      'Entrepreneurship, social innovation, business, pitching',
      'High-school students worldwide may compete in eligible teams; review the official rules for current team and age requirements.',
      'No application fee is stated on the official competition portal.',
      'Develop an original concept and prepare a virtual or pre-recorded pitch before the January submission deadline.',
      'Entrepreneurship, social innovation, problem-solving, pitching, and collaboration.',
      'Competitive',
      array['entrepreneurship', 'social innovation', 'high school', 'competition', 'pitching'],
      '1. Create an account on the official portal. 2. Form an eligible team and develop an original idea. 3. Submit the required materials by 14 January 2027 at 5:00 p.m. EST.',
      'Review the official rules and team eligibility before registering.',
      null,
      'https://diamondchallenge.org/'
    ),
    (
      'AWS Student Community Day Kathmandu 2026',
      'Workshop',
      'A student-focused AWS community event in Kathmandu featuring cloud-computing sessions, networking, and technical learning for students interested in AWS and modern technology.',
      'AWS User Group / Lord Buddha Education Foundation',
      'https://www.meetup.com/aws-sbg-at-lord-buddha-education-foundation/events/316990731/',
      null, date '2026-11-28', date '2026-11-28',
      'Kathmandu, Nepal', false,
      'Cloud computing, AWS, technology, networking',
      'Student-focused event; review the official Meetup listing for current attendance requirements.',
      'Check the official Meetup listing for current attendance or ticket information.',
      'One-day event on 28 November 2026.',
      'Cloud-computing awareness, technical learning, networking, and community engagement.',
      'Beginner-friendly',
      array['AWS', 'cloud computing', 'technology', 'Kathmandu', 'students'],
      '1. Open the official Meetup event. 2. Sign in or create a Meetup account. 3. RSVP and follow the organizer''s event instructions.',
      'Confirm location, attendance requirements, and any age policy on the official event page.',
      null,
      'https://www.meetup.com/aws-sbg-at-lord-buddha-education-foundation/events/316990731/'
    )
)
insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, application_steps, eligibility_details,
  contact_info, source_url, source_type, created_by, lifecycle_status,
  is_verified, verification_status
)
select
  l.title, l.type, l.description, l.organizer, l.registration_link,
  l.deadline, l.start_date, l.end_date, l.location, l.is_online,
  l.subject_area, l.grade_requirements, l.cost, l.time_commitment,
  l.skills_gained, l.difficulty_level, l.tags, l.application_steps,
  l.eligibility_details, l.contact_info, l.source_url, 'manual',
  current_setting('opportunityhub.import_owner_id')::uuid, 'pending_review',
  false, 'unverified'
from listings l
where not exists (
  select 1
  from public.opportunities existing
  where existing.source_url = l.source_url
     or lower(trim(existing.title)) = lower(trim(l.title))
);

commit;

-- Expected result: 7 new opportunities at most, all in pending_review.
-- Visit /admin/publisher-review to approve each listing before students see it.
