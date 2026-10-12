-- =============================================================================
-- OpportunityHub — INTEGRATED opportunities seed (parts 1 + 2 + 3 merged)
-- Run AFTER complete-schema.sql. This one file replaces seed-opportunities.sql
-- (part 1), part 2 and part 3, so run only this file.
--
-- Safe to re-run and safe on a database that already ran parts 1-3: rows are
-- upserted by title (existing rows are updated in place, so saved_opportunities
-- links are kept). ai_summary, portfolio_tips and ai_enriched_at are never touched.
--
-- Status of each row (also written into eligibility_details where it matters):
--   VERIFIED      checked against an official or primary page on Oct 10-11, 2026
--   THIN          taken from an aggregator summary; official notice not read
--   LISTING-ONLY  YatraMap listing data; not checked against the official site
-- Run check-links.py on this file to test every URL from your own machine.
-- =============================================================================

-- 1) Remove old sample rows and rows that do not apply to Nepali students
--    (saved_opportunities rows that point at them go with them, by cascade).
delete from public.opportunities
where registration_link like 'https://example.com/%'
   or title in (
     'Math Kangaroo 2027',
     'International Chemistry Olympiad (IChO) - Nepal Team Selection'
   );

-- 2) One row was renamed after checking: keep its id (and any saves).
update public.opportunities
set title = 'Japan Resource Center (JRC) - Embassy of Japan, Kathmandu'
where title = 'Japan Information Center Kathmandu';

-- 3) Titles must be unique so rows can be upserted by title.
create unique index if not exists opportunities_title_key
  on public.opportunities (title);

-- =============================================================================
-- 4) FULL-DETAIL ROWS, group A (government/university, olympiads, Nepal programs)
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
select
  title, type, description, organizer, registration_link, deadline::date,
  start_date::date, end_date::date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags::text[], prep_resources, application_steps,
  eligibility_details, contact_info, source_url
from (values

  -- VERIFIED: spaceappschallenge.org
  (
    'NASA Space Apps Challenge 2026',
    'Hackathon',
    $$Free two-day global hackathon (theme: The Next Frontier) where individuals and teams use NASA and partner space-agency open data to tackle official challenge statements. Choose an in-person or virtual Local Event (450+ worldwide). Projects submitted by the deadline earn a participation certificate and can enter Global Judging.$$,
    'NASA',
    'https://www.spaceappschallenge.org/2026/',
    '2026-11-15',
    '2026-11-14',
    '2026-11-15',
    'Online or local events worldwide',
    true,
    'Technology',
    'All ages and skill levels',
    'Free',
    '2-day hackathon plus team setup beforehand',
    'Data analysis, coding, teamwork, problem solving, presentation',
    'Beginner',
    array['hackathon','NASA','space','coding','free','online'],
    $$Challenge summaries released Sept 17, 2026; full challenge statements released Oct 28, 2026. NASA open-data links are on the official site.$$,
    $$1) Create a NASA Space Apps account. 2) Register for the 2026 hackathon (open until Nov 15). 3) Choose an in-person or virtual Local Event (can be changed until Nov 15). 4) Join or form a team. 5) Work on a challenge Nov 14-15 and submit your project by Nov 15. 6) Complete the participant survey by Nov 30.$$,
    $$Open worldwide to all ages and skill levels; free. Teams of up to six. Project submission opens Sat Nov 14 at 9:00 AM and closes Sun Nov 15 at 11:59 PM local time; registration closes Nov 15. Every participant who submits a project receives a participation certificate. Register and pick a Local Event (in person or virtual) or the virtual Universal Event.$$,
    $$Official site: https://www.spaceappschallenge.org/2026/$$,
    'https://yatramap.codeyatranp.com/opportunities/nasa-space-apps-challenge-2026-global-hackathon'
  ),

  -- VERIFIED: cliburn.org
  (
    'Cliburn International Competition for Young Pianists 2027',
    'Competition',
    $$Piano competition for ages 13-17. The Cliburn selects 38 Piano Fellows for an in-residence fellowship at SMU (masterclasses, workshops, performances); 24 of them compete for prizes and finalists perform with the Dallas Symphony Orchestra.$$,
    'The Cliburn',
    'https://cliburn.org/competitions/2027-young-pianists/application-and-rules',
    '2026-11-17',
    '2027-06-10',
    '2027-06-19',
    'Dallas, Texas, USA (SMU)',
    false,
    'Music',
    'Pianists aged 13-17',
    $$USD 125 non-refundable application fee. Selected Piano Fellows are fully funded: housing, meals, transport and one economy round-trip ticket to Dallas.$$,
    'Fellowship begins June 7, 2027; competition June 10-19, 2027',
    'Performance, repertoire preparation, masterclass experience',
    'Advanced',
    array['music','piano','competition','international'],
    $$Repertoire requirements are in the official rules; no changes to submitted repertoire are accepted after Feb 23, 2027.$$,
    $$1) Read the application and rules page. 2) Apply through the Cliburn's online system (app.getacceptd.com/cliburnyp) and pay the USD 125 fee by 11:59 p.m. CST (GMT-6) on Nov 17, 2026; no late applications. 3) Upload a 15-20 minute unedited video (one virtuosic etude, one Classical sonata movement, one slow lyrical work) filmed within six months of submission. 4) Notification Jan 26, 2027; Piano Fellows announced Feb 9, 2027; repertoire changes close Feb 23, 2027.$$,
    $$Open to pianists of all nationalities born after June 19, 2009 and on or before June 7, 2014. Previous first-prize winners of this competition are not eligible. Selected fellows must be in residence on the SMU campus June 7-20, 2027 and join every fellowship activity. Fellows outside the US arrange their own visas; the Cliburn helps after acceptance.$$,
    $$Eli Miller, emiller@cliburn.org, +1 817 738 6536$$,
    'https://yatramap.codeyatranp.com/opportunities/cliburn-international-competition-young-pianists-2027'
  ),

  -- PARTLY VERIFIED: past YIRA cycles checked; 2027 dates not published
  (
    'YIRA Global Essay Competition 2027 (Yale)',
    'Competition',
    $$Write an essay of about 400 words on a global issue and get feedback from Yale students. Open to students in grades 8-12 worldwide. Finalist essays are judged by Yale students, and all participants receive certificates from YIRA and Learn with Leaders.$$,
    'Yale International Relations Association (YIRA)',
    'https://www.yira.org/',
    null,
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'Grades 8-12',
    $$Registration fee (USD 25 in the 2024-25 cycle; 2027 fee not confirmed)$$,
    'About 400 words plus optional January webinars',
    'Writing, research, global awareness, critical thinking',
    'Intermediate',
    array['essay','international relations','writing','global issues','online'],
    $$In the 2025-26 cycle YIRA ran free January webinars on global issues and essay writing; essays were submitted in early February and finalists announced in March.$$,
    $$Register on the YIRA competition site before the registration deadline, attend the optional January webinars, then submit your ~400-word essay in the early-February window (timeline based on previous cycles).$$,
    $$Grades 8-12 worldwide. The 2027 dates are not published yet. Earlier cycles: registration closed Dec 31, 2024 (2025 edition) and Jan 8, 2026 (2026 edition; early deadline Jan 6), with essays submitted in early February. Treat any December date you see elsewhere as provisional and re-check yira.org.$$,
    null,
    'https://yatramap.codeyatranp.com/opportunities/yira-global-essay-competition-2027-yale-high-school'
  ),

  -- VERIFIED: indembkathmandu.gov.in/mgss (page updated Oct 11, 2026)
  (
    'Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11',
    'Scholarship',
    $$Embassy of India scholarship for Nepali Class 11 students: NPR 24,000 per year for two years (Class 11 and Class 12). The Class 12 instalment continues only after you submit your Class 11 result and a status letter.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/mgss',
    null,
    null,
    null,
    'Nepal (nationwide)',
    false,
    'Education',
    'Class 11 (not Diploma) at a recognized institute in Nepal',
    'No application fee',
    'Online application plus document uploads',
    null,
    'Intermediate',
    array['scholarship','nepal','class 11','+2','embassy of india'],
    null,
    $$Apply online on goischolarship.com.np when the portal opens (it only works while the scheme is open). Upload: passport photo, notarized citizenship certificate of you or your parents, Class 10 mark sheet, an attested letter from your principal confirming you study in Class 11, income proof issued by the local authority (LDO/CDO), and a disability certificate if applicable. Printouts are not needed. If selected you receive NPR 24,000 a year; for the second year send your Class 11 mark sheet and a Class 12 status certificate by 31 December to the Embassy Education Wing or attacheedu.kathmandu@mea.gov.in. Apply yourself only: the Embassy does not accept applications through agents or consultants.$$,
    $$Nepali citizen and regular Class 11 student at a recognized institute in Nepal, with at least 60% aggregate marks in Class 10, family income below NPR 200,000 a year, and no other scholarship. The Embassy page says the scheme normally opens in October/November on the online portal. The 2026-27 notice was not posted when checked on Oct 11, 2026, so no deadline is confirmed. Past cycles: 2024-25 closed Nov 29, 2024 after an extension; 2025-26 opened Oct 6, 2025, was due Nov 2 and was extended to Nov 20, 2025.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://yatramap.codeyatranp.com/opportunities/mahatma-gandhi-scholarship-nepal-2026'
  ),

  -- VERIFIED: Embassy of India notices (2025-26 cycle is the latest found)
  (
    'Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate',
    'Scholarship',
    $$Embassy of India scholarship for Nepali students starting bachelor-level courses (including MBBS and engineering). The scholarship runs 3, 4 or 5 years depending on the course.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/',
    null,
    null,
    null,
    'Nepal (nationwide)',
    false,
    'Education',
    'Class 12 graduates entering a bachelor-level course in Nepal',
    'No application fee',
    'Online application plus document uploads',
    null,
    'Intermediate',
    array['scholarship','nepal','undergraduate','embassy of india','MBBS','engineering'],
    null,
    $$Apply online through the Embassy web portal and upload your Class 12 mark sheet and proof of Nepali citizenship; follow the Embassy notice for admission and enrolment documents.$$,
    $$Nepali citizen studying in Nepal with at least 70% aggregate marks in Class 12 (excluding Class 11), aged 17 to 22 as of 1 July 2026. Date note: the 2026-27 notice was not on the Embassy website on Oct 10, 2026, so no deadline is confirmed. Past cycles: 2024-25 closed Nov 29, 2024 after an extension; 2025-26 opened Oct 6, 2025, was due Nov 2 and was extended to Nov 20, 2025.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://yatramap.codeyatranp.com/opportunities/golden-jubilee-scholarship-nepal-2026'
  ),

  -- VERIFIED: University of Toronto dates (YatraMap had the wrong nomination date)
  (
    'Lester B. Pearson International Scholarship 2027 (University of Toronto)',
    'Scholarship',
    $$Four-year, fully funded undergraduate scholarship (tuition, books, incidental fees and full residence support) for about 37 international students entering their first degree at the University of Toronto in September 2027.$$,
    'University of Toronto',
    'https://www.future.utoronto.ca/pearson',
    '2026-11-06',
    null,
    null,
    'University of Toronto, Canada',
    false,
    'Any undergraduate program',
    'Final-year international secondary students graduating in 2027',
    'Fully funded for 4 years',
    'Several application stages, Oct-Nov 2026',
    'Academic excellence, leadership, essay writing',
    'Advanced',
    array['scholarship','canada','undergraduate','fully funded','university of toronto'],
    null,
    $$1) Your school must nominate you through U of T's Pearson nomination system (deadline was Oct 9, 2026). 2) Submit your U of T undergraduate admission application (OUAC) by Oct 16, 2026. 3) Complete the Pearson application through the personalised link U of T sends you, with all documents, by Nov 6, 2026. Recipients are notified from late January 2027.$$,
    $$International student (requiring a study permit) in the final year of secondary school, starting first-entry undergraduate study at U of T in September 2027 with no prior post-secondary enrolment. The school nomination deadline (Oct 9, 2026) has already passed, so only continue if your school has nominated you. YatraMap lists Oct 16 as the nomination deadline; U of T sources show Oct 9 for nomination and Oct 16 for the admission application.$$,
    $$Use the Pearson Scholarship Inquiry Form on https://www.future.utoronto.ca/pearson$$,
    'https://yatramap.codeyatranp.com/opportunities/lester-b-pearson-international-scholarship-2027-toronto-undergraduate'
  ),

  -- VERIFIED: UBC International Scholars Program pages and guides
  (
    'UBC International Scholars Program 2027',
    'Scholarship',
    $$Need-and-merit-based awards for international students entering a first undergraduate degree at UBC (Vancouver or Okanagan). One application covers four awards, including the Karen McKellin International Leader of Tomorrow Award; the value varies by award.$$,
    'University of British Columbia',
    'https://yatramap.codeyatranp.com/opportunities/ubc-international-scholars-program-2027',
    '2026-11-15',
    null,
    null,
    'UBC Vancouver / Okanagan, Canada',
    false,
    'Any undergraduate program',
    'Final-year secondary students applying for September 2027 entry',
    'UBC admission application fee applies',
    'Applications open early Oct 2026; documents due Jan 31, 2027',
    'Leadership, essay writing, academic excellence',
    'Advanced',
    array['scholarship','canada','undergraduate','leadership','UBC'],
    null,
    $$1) Submit your UBC undergraduate admission application and choose your first-choice program. 2) Create your International Scholars application, invite a nominator and a teacher referee, and complete the essays and financial documentation by Nov 15, 2026 (11:59 p.m. Vancouver time). 3) Send supporting documents by Jan 31, 2027. Results come Feb-Apr 2027.$$,
    $$International students entering a first undergraduate degree directly from secondary school (September 2027 intake). Demonstrated financial need is required for all four awards, and not every UBC degree is eligible. The general UBC admission deadline (Jan 15, 2027) is too late for this scholarship.$$,
    $$Official UBC admissions site: https://you.ubc.ca/$$,
    'https://yatramap.codeyatranp.com/opportunities/ubc-international-scholars-program-2027'
  ),

  -- VERIFIED: nepalastronomicalsociety.org (13th NAO, 2026 edition)
  (
    'National Astronomy Olympiad (NAO) - Nepal',
    'Olympiad',
    $$Early-stage talent hunt for secondary school students in Nepal, run by the Nepal Astronomical Society since 2014. Top performers go on to Nepal's teams for international astronomy olympiads (IOAA 2026 in Vietnam, IOAA-junior 2026 in Thailand).$$,
    'Nepal Astronomical Society (NASO)',
    'https://www.nepalastronomicalsociety.org/projects/olympiad/',
    null,
    null,
    null,
    'Provincial exam centres across Nepal (Kathmandu centre in 2026: Herald College, Naxal)',
    false,
    'Science',
    'Classes 8-12 (Junior: classes 8-10; Senior: classes 11-12), ages 13-20',
    'NPR 1,000 (NPR 500 with a ward-office letter) in the 2026 edition',
    'One provincial-round exam day plus preparation',
    'Astronomy, physics reasoning, problem solving',
    'Intermediate',
    array['astronomy','olympiad','nepal','science','physics'],
    null,
    $$1) Fill in the online registration form on the Nepal Astronomical Society site. 2) Pay the fee by the QR code in the form. 3) Sit the provincial round at your assigned centre. In 2026: registration deadline Jan 9, provincial exam Jan 17.$$,
    $$Nepali students in classes 8-12 (Junior 8-10, Senior 11-12), ages 13-20; foreign nationals studying in Nepal are not eligible. The fee is non-refundable. Date note: details above are from the 13th NAO (2026; registration closed Jan 9, 2026; closed camp June 1-7, 2026; 16 students then named to IOAA 2026 in Vietnam, IOAA-junior in Thailand and OWAO in Russia). The 14th edition had not been announced on Oct 11, 2026, so the deadline is blank. Expect registration around the new year.$$,
    $$Via https://www.nepalastronomicalsociety.org/$$,
    'https://www.nepalastronomicalsociety.org/event/13th-nao2026-nepal/'
  ),

  -- VERIFIED: globalgamejam.org pages and program listings
  (
    'Global Game Jam 2027',
    'Hackathon',
    $$Build a game in 48 hours with teammates worldwide at a local jam site or online. The 2027 jam week runs January 25-31; most sites use the weekend inside that week. There is also GGJ NEXT, a jam for ages 12-17. No prizes; the focus is on learning and community.$$,
    'Global Game Jam',
    'https://globalgamejam.org/',
    null,
    '2027-01-25',
    '2027-01-31',
    'Online',
    true,
    'Technology',
    'All ages and experience levels (GGJ NEXT: ages 12-17)',
    'Free',
    null,
    null,
    null,
    array['game design','hackathon','coding','online'],
    null,
    null,
    $$Open worldwide. Jam-site hosts register from Nov 1, 2026; individual jammers can register from Dec 1, 2026 on globalgamejam.org (per program listings; confirm there). Another listing shows a Jan 23-25 weekend, so check your local site's own 48-hour window.$$,
    null,
    'https://yatramap.codeyatranp.com/opportunities/global-game-jam-2027'
  ),

  -- VERIFIED: Embassy of Japan JRC page (this row was called "Japan Information Center Kathmandu")
  (
    'Japan Resource Center (JRC) - Embassy of Japan, Kathmandu',
    'Opportunity',
    $$Embassy of Japan library in Panipokhari, Kathmandu, open to members. Offers reference books, a video library and counseling and guidance on higher studies and scholarships in Japan, plus study-tour programs.$$,
    'Embassy of Japan in Nepal',
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00138.html',
    null,
    null,
    null,
    'Embassy of Japan, Panipokhari, Kathmandu',
    false,
    'Study Abroad',
    'Students planning to study in Japan',
    'Membership (check the Embassy page)',
    null,
    null,
    null,
    array['japan','study abroad','MEXT','advising','kathmandu'],
    null,
    null,
    $$Membership is required: bring ID, fill the Embassy form and submit it with photographs and a recommendation from your organization (see the official page for current steps).$$,
    $$jrc-emb@km.mofa.go.jp (Mon-Fri, 9:30 AM-5:00 PM, closed 1:00-2:00 PM)$$,
    'https://yatramap.codeyatranp.com/opportunities/japan-information-center-kathmandu'
  )

) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, start_date = excluded.start_date,
  end_date = excluded.end_date, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  time_commitment = excluded.time_commitment, skills_gained = excluded.skills_gained,
  difficulty_level = excluded.difficulty_level, tags = excluded.tags,
  prep_resources = excluded.prep_resources, application_steps = excluded.application_steps,
  eligibility_details = excluded.eligibility_details, contact_info = excluded.contact_info,
  source_url = excluded.source_url;

-- =============================================================================
-- 5) FULL-DETAIL ROWS, group B (government scholarships and entrance routes,
--    sports, international programs, schools and colleges)
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
select
  title, type, description, organizer, registration_link, deadline::date,
  start_date::date, end_date::date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags::text[], prep_resources, application_steps,
  eligibility_details, contact_info, source_url
from (values

  -- ===== Government, embassy and university scholarships / entrance routes =====

  -- VERIFIED: ekantipur and Kathmandu Metropolitan City notices (2083/84 cycle)
  (
    'Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)',
    'Scholarship',
    $$Kathmandu Metropolitan City (KMC) places students in the scholarship quota of institutional (private) schools and colleges for Class 11 and 12 through an exam based on the Class 10 curriculum. Selected students pay no tuition fees in Classes 11-12. In 2083/84, 4,857 quota seats were set across 145 institutions in the city, and more than 26,000 students applied.$$,
    'Kathmandu Metropolitan City, Education Department',
    'https://entrance.kathmandu.gov.np/',
    null,
    null,
    null,
    'Kathmandu Metropolitan City, Nepal',
    false,
    'Education',
    'SEE graduates (Class 10) entering Class 11',
    'Free to apply; selected students study fee-free',
    'Online application plus one 2-hour exam',
    null,
    'Intermediate',
    array['scholarship','class 11','+2','kathmandu','metro scholarship','nepal'],
    $$The exam is 100 multiple-choice questions on the Class 10 (secondary level) curriculum, held 8-10 AM; the pass mark has been 40%. KMC publishes past question papers on its entrance portal.$$,
    $$1) Watch for the KMC notice around Baisakh-Jestha (the 2083/84 notice opened Jestha 1, 2083). 2) Apply online at entrance.kathmandu.gov.np with your SEE grade sheet, citizenship or birth certificate and the school or ward recommendation the notice asks for. 3) Print your admit card two days before and sit the exam (2083/84: Jestha 17, 8-10 AM). 4) After the merit list, choose subjects and schools in order of priority; leftover seats went to a final "wrap-up" round (re-application closed Ashad 8, 2083).$$,
    $$Date note: the 2083/84 cycle is finished (applications Jestha 1-10, 2083; exam Jestha 17, 2083). No 2084/85 notice exists yet; expect it around Baisakh-Jestha 2084 (about May 2027). Eligibility has centred on permanent residents of Kathmandu Metropolitan City who finished SEE at a community school, or at a private school on a scholarship. Rules, documents and reservation categories change each year, so read the current notice.$$,
    $$Education Department, Kathmandu Metropolitan City, Kamaladi: kathmandu.gov.np$$,
    'https://ekantipur.com/national/2026/06/18/en/kathmandu-metropolitan-city-calls-for-re-application-for-11th-and-12th-grade-scholarships-54-22.html'
  ),

  -- VERIFIED: Embassy of India / CGI Birgunj advertisement PDF (2026-27 cycle)
  (
    'Atal Bihari Vajpayee General Scholarship Scheme (ABVGSS) - ICCR, Undergraduate in India',
    'Scholarship',
    $$ICCR scholarship for Nepali nationals to study undergraduate courses at Indian universities and institutes, applied for through the ICCR A2A portal and the Embassy of India in Kathmandu. It does not cover medical or paramedical courses, law, or integrated courses such as BALLB.$$,
    'Indian Council for Cultural Relations (ICCR) via Embassy of India, Kathmandu',
    'https://a2ascholarships.iccr.gov.in/',
    null,
    null,
    null,
    'India (university or institute allotted by ICCR)',
    false,
    'Any undergraduate program',
    'Class 12 graduates aged 18-35 (as of July 1 of the application year)',
    'NPR 400 application fee (bank deposit)',
    'Online application, essay and in-person document submission',
    null,
    'Intermediate',
    array['scholarship','india','iccr','undergraduate','embassy of india','nepal'],
    null,
    $$1) Apply on the A2A portal (a2ascholarships.iccr.gov.in). 2) Deposit the NPR 400 fee at Nepal SBI in favor of the Embassy's Education Wing and write your online registration number and name on the receipt. 3) Submit the original receipt, a printout of your application and the uploaded documents to the Embassy of India in Kathmandu, or to the Consulate General in Birgunj if you are from Bara, Chitwan, Dhanusha, Mahottari, Makwanpur, Parsa, Rautahat or Sarlahi. 4) Write the mandatory 500-word essay and include the English-proficiency undertaking signed by your last school's principal.$$,
    $$Date note: the 2026-27 window closed April 15, 2026 (portal opened Feb 27, 2026). The Embassy home page lists an "ICCR Scholarship 2027-28" update that was not read, so expect the next window around Feb-Apr 2027. Science and engineering applicants need Physics, Chemistry and Mathematics in Class 12 (biology-based courses need Biology, Physics, Chemistry). Age: 18 minimum, 35 maximum for undergraduate courses as of July 1. Applications are accepted only directly from the student, not through agents.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://www.cgibirgunj.gov.in/docs/1773213084ICCR-GSS-SJSS-2026-27-Advertisement.pdf'
  ),

  -- VERIFIED: Embassy of Japan in Nepal MEXT page (2027 intake cycle)
  (
    'Japanese Government (MEXT) Scholarship - Undergraduate (Embassy of Japan in Nepal)',
    'Scholarship',
    $$Fully funded Japanese government scholarship for Nepali students to study for a bachelor's degree in Japan. Reported benefits are tuition, a monthly stipend (about JPY 117,000 for undergraduate students) and airfare. All applications go through the Embassy of Japan in Kathmandu and no application fee is charged. Many undergraduate programs are taught in Japanese.$$,
    'Embassy of Japan in Nepal / MEXT',
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html',
    null,
    null,
    null,
    'Japan (university placement by MEXT)',
    false,
    'Any undergraduate program',
    'Class 12 completers; the 2027 intake required birth after April 2, 2002',
    'No application fee; fully funded if selected',
    'Application, written exams and interview over several months',
    null,
    'Advanced',
    array['scholarship','japan','mext','undergraduate','embassy of japan','nepal','fully funded'],
    null,
    $$1) Watch the Embassy of Japan scholarship page around April-May. 2) Download the undergraduate forms, complete them and email them to education@km.mofa.go.jp before the deadline. 3) Sit the Embassy written exam and interview if shortlisted. 4) MEXT makes the final selection and placement.$$,
    $$Date note: for the 2027 intake the Embassy's undergraduate deadline was June 14, 2026 (24:00), and the page was published Apr 21-26, 2026. The 2028-intake call is expected around April-May 2027; no date is confirmed. Nepal receives few undergraduate awards a year (one undergraduate award was reported for the 2026 cycle).$$,
    $$education@km.mofa.go.jp$$,
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html'
  ),

  -- VERIFIED: edusanjal listings of the four 2083 provincial notices
  (
    'Kathmandu University Provincial Government Tuition Scholarships (Bagmati, Gandaki, Karnali, Madhesh)',
    'Scholarship',
    $$Four provincial governments each recommend students for tuition-fee scholarships at Kathmandu University undergraduate programs, such as BE Mining, BE Chemical, BE Environmental, B.Sc. Environmental Science, Bachelor in Health Informatics and (Bagmati, Karnali) B.Sc. Agriculture. Usually one seat per listed program per province, and only the tuition fee is waived.$$,
    'Provincial governments of Bagmati, Gandaki, Karnali and Madhesh with Kathmandu University',
    'https://edusanjal.com/scholarship/ku-bagmati-provincial-scholarship/',
    null,
    null,
    null,
    'Kathmandu University, Dhulikhel',
    false,
    'Science and Engineering',
    'Class 12 Science graduates from the province',
    'Tuition fee waived; other KU fees paid by the student',
    'Email or office application with documents in one PDF',
    null,
    'Intermediate',
    array['scholarship','kathmandu university','provincial','engineering','science','nepal'],
    null,
    $$1) Watch your provincial social development or education ministry website around Asar-Shrawan for the KU notice. 2) Compile the application letter, Class 12 marksheet, citizenship, ID of underprivileged status (if applicable) and the other listed documents into a single PDF. 3) Send it to the ministry by the deadline (2083: Bagmati mosd.bagamati@gmail.com; Gandaki mosdgedu@gmail.com). 4) Madhesh also holds an interview with a three-member ministry committee.$$,
    $$Date note: the 2083/84 windows are all closed (Bagmati Jul 2-16, 2026; Madhesh Jul 2-22; Gandaki Jul 10-30; Karnali Jul 13-27). The next notices are expected around June-July 2027. Eligibility differs by province: Bagmati needs permanent residence in Bagmati; Gandaki needs Grade 12 Science completed in 2083 BS with priority to top scores; Karnali needs Class 12 Science from a Karnali school; Madhesh scores marks, local-level hardship recommendation (up to 10) and an interview (up to 20). Apply to only one program per notice.$$,
    $$See each province's notice via edusanjal.com (KU Bagmati, Gandaki, Karnali and Madhesh Provincial Scholarship 2083).$$,
    'https://edusanjal.com/scholarship/ku-madhesh-provincial-scholarship/'
  ),

  -- VERIFIED: Diplomat Nepal report of the ministry notice (Jul 30, 2026)
  (
    'Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy',
    'Scholarship',
    $$Government of Pakistan scholarships for Nepali students, offered through Nepal's Ministry of Education and Sports, for B.Sc. Engineering (Civil, Computer and Electrical: 2 seats each) and D Pharmacy (8 seats) for 2026-27. Selection uses the IOE Pulchowk entrance examination merit list.$$,
    'Government of Pakistan via Ministry of Education and Sports (Nepal)',
    'https://diplomatnepal.com/news/ministry-of-education-introduces-scholarship-opportunity-for-nepali-students-under-ptap/',
    null,
    null,
    null,
    'Pakistan (host institutions)',
    false,
    'Engineering and Pharmacy',
    'Class 12 (or equivalent) graduates with an IOE entrance result',
    'Scholarship (check the ministry notice for covered costs)',
    'Google Form plus documents',
    null,
    'Intermediate',
    array['scholarship','pakistan','ptap','engineering','pharmacy','nepal'],
    null,
    $$1) Watch the education ministry's notices after IOE results are out. 2) Fill the ministry's Google Form within the deadline. 3) Attach your transcript, Nepali citizenship certificate and IOE entrance score card.$$,
    $$Date note: the 2026-27 call was published around Jul 30, 2026; the news item gives no deadline and no later notice was found. The next call is expected after the 2027 IOE results (about Jul-Aug 2027). You must have passed Grade 12 and appear in the IOE entrance results.$$,
    $$Ministry of Education and Sports, Government of Nepal$$,
    'https://diplomatnepal.com/diplomacy/education/ministry-of-education-introduces-scholarship-opportunity-for-nepali-students-under-ptap/'
  ),

  -- THIN: educatenepal summary of the ministry notice (details not read in full)
  (
    'Nepal Government Engineering Scholarship (IOE Merit List) - Education Ministry',
    'Scholarship',
    $$The Scholarship Department of Nepal's education ministry (Kesharmahal) invites applications for government-funded scholarships in B.Sc.-level engineering for candidates placed on the Tribhuvan University Institute of Engineering (IOE) entrance merit list. Students who pass the IOE entrance and meet the ministry's scholarship regulations are eligible.$$,
    'Ministry of Education (Government of Nepal), Scholarship Department',
    'https://www.educatenepal.com/news/detail/engineering-scholarship-from-ministry-of-education-science-and-technology-government-of-nepal',
    null,
    null,
    null,
    'Nepal',
    false,
    'Engineering',
    'Class 12 graduates on the IOE entrance merit list',
    'Scholarship (check the ministry notice for covered costs)',
    null,
    null,
    'Intermediate',
    array['scholarship','engineering','ioe','government','nepal'],
    null,
    $$1) Sit the IOE BE/BArch entrance exam. 2) When the ministry publishes the scholarship notice after the results, apply by the deadline with your IOE score card and documents.$$,
    $$Thin entry: based on the educatenepal.com summary of the ministry notice; the notice itself was not read, and no 2083/84 deadline was found. Read the ministry notice for quotas, income and category rules.$$,
    $$Scholarship Department, Kesharmahal, Kathmandu$$,
    'https://www.educatenepal.com/news/detail/engineering-scholarship-from-ministry-of-education-science-and-technology-government-of-nepal'
  ),

  -- VERIFIED: MEC notices (MECEE-BL 2027, notices dated Aug 7 and Sept 7, 2026)
  (
    'MECEE-BL - Medical Education Common Entrance Exam (MBBS, BDS, Nursing and other health programs)',
    'Opportunity',
    $$The Medical Education Commission's single national entrance exam for bachelor-level health programs: MBBS, BDS, BSc Nursing/Midwifery, BASLP, B Perfusion Technology, BAMS, BNS, BSc MLT, BSc MIT, B Pharmacy, B Optometry, BPT and BPH. Seats are allocated by rank at central counseling.$$,
    'Medical Education Commission (MEC), Government of Nepal',
    'https://entrance.mec.gov.np/',
    null,
    null,
    null,
    'Kathmandu Valley exam centers',
    false,
    'Health Sciences',
    'Class 12 (+2 / A-level) graduates, usually with Physics, Chemistry and Biology',
    'About NPR 4,000 for Nepali applicants (2027 cycle, per listings)',
    'Online application plus a 3-hour exam',
    null,
    'Advanced',
    array['entrance exam','mbbs','bds','nursing','medical','nepal','mec'],
    $$MEC published a revised syllabus (revised April 28, 2026) for the bachelor-level common entrance. Use the MEC site for syllabus and past papers.$$,
    $$1) Watch mec.gov.np for the notice (2027 cycle: notice Shrawan 21, 2083). 2) Apply at entrance.mec.gov.np with the regular fee, then pay a double fee in the grace window if you missed it. 3) Download your admit card from your profile five days before the exam. 4) After the result, fill your priorities for central matching and admission.$$,
    $$Date note: MECEE-BL 2027 applications closed (regular fee Shrawan 25-Bhadra 15, 2083, i.e. Aug 10-31, 2026, with a double-fee grace period to about Sept 7); the exam is in about the third week of Ashoj 2083 (Oct 2026), with exact dates published in the Sept 7, 2026 notice. The previous round (MECEE-BL 2026) ran Nov 1-2, 2025. The next application window is expected around Aug-Sept 2027. Subject and percentage requirements vary by program; read the current notice.$$,
    $$entrance@mec.gov.np$$,
    'https://mec.gov.np/np'
  ),

  -- VERIFIED: educatenepal and IOE notices (2083/84 cycle)
  (
    'TU Institute of Engineering (IOE) BE/BArch Entrance Examination',
    'Opportunity',
    $$Computer-based entrance exam for Bachelor of Engineering and Architecture at Tribhuvan University's Institute of Engineering constituent campuses and affiliated colleges. Rank on the exam decides seat and campus allocation, and also feeds some government scholarship schemes.$$,
    'Tribhuvan University, Institute of Engineering (IOE) Entrance Examination Board',
    'https://entrance.ioe.edu.np/',
    null,
    null,
    null,
    'Exam centers across Nepal',
    false,
    'Engineering and Architecture',
    'Class 12 (or equivalent) graduates, or students who have taken the Class 12 final exam',
    'Entrance fee set in each notice',
    'Online application plus a computer-based exam',
    null,
    'Advanced',
    array['entrance exam','engineering','ioe','tribhuvan university','nepal'],
    null,
    $$1) Watch for the IOE notice around Asar (2083/84 application ran Ashadh 23-Shrawan 1, 2083). 2) Fill the form at entrance.ioe.edu.np and pay the fee by the deadline. 3) Sit the entrance exam. 4) Fill the priority form after the result and join the counseling.$$,
    $$Date note: the 2083/84 round is finished (applications Jul 7-17, 2026; exam from about Shrawan 11, 2083). The next notice is expected about June-July 2027. Past rule: at least 45% in Physics, Chemistry and Mathematics across Class 11 and 12 with at least a C grade in each (NEB); students who have taken the Class 12 final exam can also apply. Read the current notice for fees and the latest rule.$$,
    $$Entrance Examination Board, IOE, Pulchowk/Lalitpur$$,
    'https://blog.educatenepal.com/2026/06/tu-institute-of-engineering-ioe-bebarch.html'
  ),

  -- ===== Sports (under-18). ANFA (football federation) was suspended by FIFA on
  --       24 June 2026; check football notices before planning around ANFA events. =====

  -- VERIFIED: Himalayan Times and Ratopati reports (2026 edition)
  (
    'Asian Paints Champions Cup - Inter-School U-18 National Football Tournament (Boys and Girls)',
    'Competition',
    $$Nationwide inter-school football tournament for boys' and girls' under-18 teams, with provincial qualifiers and a national championship final in Kathmandu. The 2026 edition was organized by The Himalayan Times and Himalayan Dialogue with National Sports Council approval, with more than 300 schools and over 9,000 players.$$,
    'The Himalayan Times / Himalayan Dialogue (with National Sports Council approval)',
    'https://www.championscuptht.com/',
    null,
    null,
    null,
    'Provincial venues in all seven provinces; final in Kathmandu',
    false,
    'Sports',
    'School teams, boys and girls under 18',
    'Free to register in 2026 (check the current notice)',
    'About one month of rounds (2026: mid-September to Oct 2)',
    'Teamwork, football, competition experience',
    'Intermediate',
    array['sports','football','under-18','inter-school','nepal'],
    null,
    $$1) Your school registers a team on championscuptht.com before the deadline (2026: Aug 15). 2) Play the provincial selection rounds (2026: from Bhadra 25, at 14 grounds). 3) In 2026, six boys' teams and six girls' teams per province advanced to the national championship, with the final on Oct 2, 2026 in Kathmandu.$$,
    $$Date note: details are from the 2026 edition. The 2027 edition has not been announced; expect registration around July-August. Registration is by school team, so ask your school's sports teacher.$$,
    null,
    'https://thehimalayantimes.com/sports/all-nepal-u-18-inter-school-football-tournament-opens-registration'
  ),

  -- VERIFIED existence: The Rising Nepal report of the 14th edition (April 2024); no later dates found
  (
    'President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)',
    'Competition',
    $$The National Sports Council's biggest junior sports event: athletes under 18 are selected at school, local, district and provincial levels, then represent their province at a central tournament in Kathmandu. The 14th edition (April 16-18, 2024) had 686 athletes from seven provinces competing in athletics, volleyball, kabaddi, wushu, taekwondo and karate, with cash prizes and allowances.$$,
    'National Sports Council (Nepal)',
    'https://risingnepaldaily.com/news/41456',
    null,
    null,
    null,
    'Kathmandu (central tournament); selections in every province',
    false,
    'Sports',
    'Athletes under 18',
    'Free; participants get daily and transport allowances (2024)',
    'Selection rounds over several months plus a 3-day finals',
    'Athletics, team sports and martial arts competition',
    'Intermediate',
    array['sports','under-18','national sports council','athletics','taekwondo','karate','nepal'],
    null,
    $$1) Join your school's team in the initial phase. 2) Be selected at local, district and provincial level (through the district and provincial sports bodies). 3) If chosen, represent your province at the central tournament.$$,
    $$Date note: the details above are from the 2024 (14th) edition. Dates for later editions were not found, so ask your district sports development committee or National Sports Council for the current schedule and sport list. Provinces that won the shield thrice in a row keep it; Lumbini kept the old shield.$$,
    null,
    'https://risingnepaldaily.com/news/41456'
  ),

  -- ===== International programs and competitions =====

  -- VERIFIED: np.uwc.org calendar 2026-27 and eligibility pages
  (
    'UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)',
    'Scholarship',
    $$Selection of Nepali students for the two-year International Baccalaureate Diploma at UWC schools and colleges abroad, with full or partial scholarships depending on family finances. UWC states that 80% of IB Diploma students chosen by national committees get full or partial support. UWC Nepal usually selects about 15-20 students a year; around 300 apply.$$,
    'UWC Nepal National Committee',
    'https://np.uwc.org/how-to-apply/',
    '2026-10-31',
    null,
    null,
    'Online application; selection in Kathmandu; study at a UWC abroad',
    false,
    'Study Abroad',
    'SEE (Grade 10) completers; born Mar 1, 2009 - Sep 1, 2011',
    'Full or partial scholarship based on need (check the application for any fee)',
    'Multi-stage selection from Oct 2026 to Jan 2027',
    'Leadership, intercultural skills, IB Diploma, community service',
    'Advanced',
    array['scholarship','uwc','ib','study abroad','class 10','nepal'],
    null,
    $$1) Create your account and submit the online application on np.uwc.org (Sept 22 - Oct 31, 2026, 11:59 PM Nepal time). 2) First stage: the committee reviews forms (Nov 6-18); first-interview names are published Nov 20. 3) Second stage: written exam, group activities and interview (Nov 28-29). 4) Final stage: interview and group activities (Dec 12); results published Jan 8, 2027; nominated names go to UWC Jan 31 - Feb 28, 2027.$$,
    $$Nepali citizen (you do not need your nagarikta to apply). For 2026 entry the page asked for at least GPA 3.0 (75%) from private schools or 2.8 (70%) from government schools on SEE/CBSE/ICSE or an equivalent; confirm the exact grade rule on the 2027 page. You can apply through only one National Committee. The FAQ says students from the SEE background must take a gap year under Nepal government rules. Dates are marked tentative on the UWC Nepal calendar.$$,
    $$UWC National Committee of Nepal, Thapathali Heights, Kathmandu: np.uwc.org$$,
    'https://np.uwc.org/uwc-nepal-calendar/'
  ),

  -- VERIFIED: Yale YYGS pages and listings (2027 cycle)
  (
    'Yale Young Global Scholars (YYGS) 2027 - need-based financial aid',
    'Summer Program',
    $$Two-week residential summer academic program at Yale University for high school students from around the world. Students choose interdisciplinary sessions such as Solving Global Challenges or Innovations in Science and Technology. Need-based financial aid can cover up to 100% of tuition for students from any country; students still arrange their own transportation.$$,
    'Yale University',
    'https://globalscholars.yale.edu/',
    '2027-01-06',
    null,
    null,
    'Yale University, New Haven, Connecticut, USA',
    false,
    'Academic enrichment',
    'Current high school sophomores or juniors (or international equivalent), about ages 16-18',
    'Tuition covered by aid up to 100%; application fee waiver available; travel not covered',
    'Two-week summer session plus application essays',
    'Global perspective, seminars, leadership',
    'Advanced',
    array['summer program','yale','financial aid','usa','high school'],
    null,
    $$1) Create an account on the YYGS site and complete the application, including the financial-aid section (aid cannot be requested later). 2) Early Action closes Oct 15, 2026 (11:59 PM ET); Regular Decision closes Jan 6, 2027 (11:59 PM ET). 3) Ask your school for the fee waiver form if the application fee (reported USD 85 early, USD 100 regular) is a burden.$$,
    $$YYGS accepts applications from all countries and offers aid to students from all countries. Early Action decisions come by Dec 11, 2026; Regular Decision decisions by Mar 10, 2027 (accept by Mar 15). The deadline shown is the final Regular Decision date; Early Action is nearer (Oct 15, 2026).$$,
    $$Questions: see globalscholars.yale.edu$$,
    'https://globalscholars.yale.edu/node/1455'
  ),

  -- VERIFIED: cee.org (RSI 2027 application note)
  (
    'Research Science Institute (RSI) 2027 - MIT and Stanford',
    'Summer Program',
    $$Free six-week summer research program for 100 high school students at MIT, with 50 more places at Stanford starting in 2027. Participants take a week of intensive STEM classes, then do five weeks of mentored research and present oral and written reports. International students are accepted.$$,
    'Center for Excellence in Education (CEE) with MIT and Stanford',
    'https://www.cee.org/programs/research-science-institute',
    '2026-12-11',
    null,
    null,
    'MIT (Cambridge, MA) and Stanford (CA), USA',
    false,
    'Science and Engineering',
    'High school juniors (seniors are not eligible)',
    'Cost-free to selected students (travel is the family''s responsibility; confirm with CEE)',
    'Six-week summer program plus application essays and recommendations',
    'Research design, scientific writing, presentation',
    'Advanced',
    array['summer program','research','stem','mit','stanford','free','usa'],
    null,
    $$1) Apply through CEE (cee.org) before 11:59 PM on Dec 11, 2026; late applications are not accepted. 2) Submit essays, two math or science teacher recommendations, your transcript and test scores. 3) International students apply through the same CEE system or participating country channels; check cee.org for the current route.$$,
    $$Open to students from the US and abroad; juniors only. Very selective (reported acceptance near 2.5-3%). The official page confirms the Dec 11, 2026 deadline; recommendation, test and transcript details come from secondary guides, so read CEE's FAQ before applying.$$,
    $$Center for Excellence in Education, McLean, VA: cee.org/contact-us$$,
    'https://www.cee.org/programs/research-science-institute'
  ),

  -- VERIFIED: technovationchallenge.org and chapter pages
  (
    'Technovation Girls 2027 Season - Build an App or AI Solution',
    'Competition',
    $$Free global program and competition for girls and non-binary or gender-diverse youth aged 8-18. Teams of 1-5 build a mobile app, web app or AI-powered tool that solves a community problem over the season (August to May), with mentors and free online curriculum. Divisions: Beginner 8-12, Junior 13-15, Senior 16-18.$$,
    'Technovation',
    'https://technovationchallenge.org/get-involved/students',
    null,
    null,
    null,
    'Online',
    true,
    'Technology',
    'Girls and non-binary youth aged 8-18 on Aug 1, 2027',
    'Free',
    'Season from about October to May',
    'App or AI building, teamwork, entrepreneurship, pitching',
    'Beginner',
    array['girls','coding','ai','app','entrepreneurship','free','online'],
    $$The Technovation curriculum is free for everyone to use (including boys and adults), even outside the competition.$$,
    $$1) Register on the Technovation global platform when 2027-season registration opens (a chapter page says October 2026). 2) Form a team of up to five and find a mentor (an adult 18+ who completes Technovation's training). 3) Build, test and submit your project by the season deadline. In 2025-26 student registration ran Aug 13, 2025 - Mar 18, 2026.$$,
    $$Date note: the official page said student registration was closed pending the 2026-27 season on the date checked; opening and closing dates for the 2027 season are not confirmed, so the deadline is blank. Eligibility: ages 8-18 on August 1, 2027.$$,
    null,
    'https://technovationchallenge.org/program-overview/'
  ),

  -- VERIFIED: yris.yira.org submission page and borderless listing (annual June deadline)
  (
    'Yale Review of International Studies (YRIS) High School Essay Contest',
    'Competition',
    $$Annual essay contest from Yale's student-run Yale Review of International Studies, open to high school students worldwide. Entrants write an essay under 1,500 words on a prompt about international affairs. Top essays are published and the contest has offered cash prizes (reported at USD 250/150/100 for the top three in the 2026 listing).$$,
    'Yale Review of International Studies (YRIS), Yale International Relations Association',
    'https://yris.yira.org/submit',
    null,
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'High school students worldwide',
    'Free (per listing; confirm on the submission page)',
    'One essay (under 1,500 words)',
    'Research, argument, international affairs writing',
    'Intermediate',
    array['essay','international relations','writing','yale','free','online'],
    null,
    $$1) Check yris.yira.org/submit each spring for the new prompt and deadline. 2) Write an essay under 1,500 words (double-spaced). 3) Submit through the YRIS site before the deadline.$$,
    $$Date note: the official page showed the 2025 deadline as June 30, 2025 (11:59 PM EST), and a 2026 prompt about cultural relations exists, so the cycle is annual with a June deadline. No 2027 prompt or date has been published, so the deadline is blank.$$,
    $$Contact via yris.yira.org$$,
    'https://yris.yira.org/submit'
  ),

  -- ===== Schools and colleges =====

  -- VERIFIED: apply.ku.edu.np (KUCAT-CBT 2026 call)
  (
    'Kathmandu University KUCAT-CBT - Undergraduate Engineering and Science Admission',
    'Opportunity',
    $$Common computer-based admission test for undergraduate programs at Kathmandu University's School of Engineering and School of Science (PCM or PCB test groups), held at Dhulikhel, Lalitpur, Biratnagar and Butwal. Admission is by rank, with merit lists, quota lists and later expression-of-interest rounds. Bachelor in Health Informatics does not need KUCAT.$$,
    'Kathmandu University (School of Engineering and School of Science)',
    'https://apply.ku.edu.np/',
    null,
    null,
    null,
    'Dhulikhel, Lalitpur, Biratnagar, Butwal (test centers)',
    false,
    'Engineering and Science',
    'Class 12 (+2 Science), A-level or equivalent graduates',
    'Application form fee NPR 2,000 (2026)',
    'Online application plus a computer-based test',
    null,
    'Advanced',
    array['entrance exam','kathmandu university','engineering','science','kucat','nepal'],
    null,
    $$1) Watch apply.ku.edu.np for the Call for Application (2026 notice: June 17). 2) Register, fill the form and pay by eSewa or Khalti (2026: registration June 19 - July 9, form closed July 10). 3) Choose a test center; changes are not allowed after the deadline. 4) Sit KUCAT-CBT, check the program-wise merit list, then complete document verification and admission.$$,
    $$Date note: the 2026/27 call is finished (merit lists and orientation were in August 2026). The 2027/28 call is expected around mid-June 2027 and no date is confirmed. Full eligibility in the recent calls was a Class 12 pass with at least GPA 2.0 (50%) plus a KUCAT-CBT rank. Several KU scholarships exist; see the KU provincial scholarship entry.$$,
    $$apply.ku.edu.np$$,
    'https://apply.ku.edu.np/kucat26admissionCall.php'
  ),

  -- VERIFIED: educatenepal KUSOM notice (Fall 2026)
  (
    'Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)',
    'Opportunity',
    $$The Kathmandu University Undergraduate Management Admission Test (KUUMAT) is required for admission to KU School of Management's BBA, BBIS and affiliated-college programs, with admission strictly by merit. KUSOM lists several scholarships.$$,
    'Kathmandu University School of Management (KUSOM)',
    'https://som.ku.edu.np/',
    null,
    null,
    null,
    'Dhulikhel and affiliated colleges',
    false,
    'Management',
    'Class 12 (+2) graduates in any discipline',
    'Application and test fee (check the notice)',
    'Online application plus one multiple-choice test',
    null,
    'Intermediate',
    array['entrance exam','kathmandu university','bba','bbis','management','nepal'],
    null,
    $$1) Watch som.ku.edu.np for the call (usually announced June, test in July). 2) Apply online only. 3) Sit KUUMAT and apply to KUSOM or an affiliated college using your score.$$,
    $$Date note: the Fall 2026 round is finished (forms due July 10, 2026; test July 20, 2026). The Fall 2027 round is expected about June-July 2027 and no date is confirmed. Minimum +2 marks differ between notices (a recent KU notice used 40% aggregate or CGPA 1.6; older pages say 50%), so read the current call. Contact: admission@kusom.edu.np$$,
    $$admission@kusom.edu.np$$,
    'https://www.educatenepal.com/notice-announcements/detail/kusom-admission-notice-for-bba-and-bbis-programs'
  ),

  -- VERIFIED: SXC admission notice for Class 11 (2083 BS)
  (
    'St. Xavier''s College (Maitighar) Class 11 Science Admission and KMC Scholarship Seats',
    'Opportunity',
    $$Class 11 Science admission at St. Xavier's College, Maitighar. For 2083 (2026) admission was based only on SEE GPA shortlisting and an interview, with no entrance test. Fifty scholarship seats are reserved for candidates referred by the Education Department of Kathmandu Metropolitan City.$$,
    'St. Xavier''s College, Maitighar',
    'https://sxc.edu.np/',
    null,
    null,
    null,
    'Maitighar, Kathmandu',
    false,
    'Science',
    'SEE (Grade 10) graduates',
    'Admission fees apply; KMC scholarship seats are fee-free',
    null,
    null,
    'Advanced',
    array['class 11','+2','science','scholarship','kathmandu','nepal'],
    null,
    $$1) Watch sxc.edu.np around SEE results (Ashad-Shrawan). 2) Apply online with your SEE grade sheet and documents. 3) Attend the interview if shortlisted and complete admission within the two days after the final list.$$,
    $$Date note: the 2083 admission round is finished. The process changes yearly (2024 used an entrance test on July 13, 2024; 2026 used GPA and interview only), so read the current notice. The 50 scholarship seats are open only to candidates selected and referred by Kathmandu Metropolitan City; see the KMC Class 11-12 scholarship entry.$$,
    null,
    'https://www.collegenp.com/admission/st-xaviers-college-class-11-admission-2026'
  ),

  -- THIN: educatenepal listing of the 2083 notice; seat counts only
  (
    'Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083',
    'Scholarship',
    $$Pokhara University's Faculty of Science and Technology invites bachelor-level scholarship applications through its online scholarship portal, with seats listed by program in the 2083 notice, for example BE Civil (183 seats), BE Computer (107), BCSIT (94), BE IT (53) and BE Software (29).$$,
    'Pokhara University',
    'https://www.educatenepal.com/scholarships/detail/pokhara-university-bachelor-level-scholarship-notice',
    null,
    null,
    null,
    'Pokhara and affiliated campuses, Nepal',
    false,
    'Engineering and Technology',
    'Class 12 graduates entering Pokhara University programs',
    'Scholarship (check the notice for covered costs)',
    null,
    null,
    'Intermediate',
    array['scholarship','pokhara university','engineering','it','nepal'],
    null,
    $$Apply online through the official Pokhara University scholarship portal named in the notice, before the deadline.$$,
    $$Thin entry: taken from an educatenepal.com summary (2083/2026); the official notice, deadline and scholarship criteria were not read. Confirm everything on Pokhara University's own site before applying.$$,
    null,
    'https://www.educatenepal.com/scholarships/detail/pokhara-university-bachelor-level-scholarship-notice'
  ),

  -- THIN: Embassy of India notices on COMPEX (2025-26 cycle only)
  (
    'COMPEX Scholarship Scheme - Embassy of India, Kathmandu (Undergraduate Courses in India)',
    'Scholarship',
    $$Embassy of India scholarship scheme for undergraduate courses in India, awarded through an exam (COMPEX). For 2025-26 the Embassy posted the scheme on June 26, 2025, an exam schedule and mock-test link on July 18, 2025, and admit cards on July 23, 2025.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/education/news/scholarship',
    null,
    null,
    null,
    'Nepal (exam); India (study)',
    false,
    'Any undergraduate program',
    'Class 12 graduates (confirm in the notice)',
    'Check the Embassy notice',
    null,
    null,
    'Intermediate',
    array['scholarship','india','embassy of india','undergraduate','exam','nepal'],
    null,
    $$Watch the Embassy's scholarship news page around May-June for the COMPEX notice and exam schedule.$$,
    $$Thin entry: only the 2025-26 notice titles and dates were seen on the Embassy news list; the notice text, eligibility and fees were not read and no 2026-27 notice was found. Check the Embassy page directly before relying on this.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://www.indembkathmandu.gov.in/education/news/scholarship'
  ),

  -- VERIFIED: educatenepal copy of the school notice loaded Oct 11, 2026
  -- (bnks.edu.np itself blocks automated access)
  (
    'Budhanilkantha School Grade 11 (Science) Admission',
    'Opportunity',
    $$Budhanilkantha School, the government-designated national residential school in Budhanilkantha, Kathmandu, opens a limited number of places each year in Grade 11 (NEB, Science stream only). Admission is by entrance test.$$,
    'Budhanilkantha School',
    'https://www.educatenepal.com/notice-announcements/detail/budhanilkantha-school-announces-admission-for-neb-class-11',
    null,
    null,
    null,
    'Budhanilkantha, Kathmandu',
    false,
    'Science',
    'SEE (Grade 10) graduates meeting the Science-stream eligibility',
    $$Entrance-test charge: NPR 1,000 in the 2079 and 2081 notices; one report says the form charge was cut to NPR 100. Confirm in the current notice.$$,
    'Online application plus one entrance-test day',
    null,
    'Advanced',
    array['class 11','+2','science','entrance exam','budhanilkantha','kathmandu'],
    null,
    $$1) Watch bnks.edu.np and notice sites around Jestha-Ashad for the Grade 11 notice. 2) Fill in the online application form (the notice links the school admission portal) and pay the entrance-test charge online by eSewa, ConnectIPS or Khalti, as in the 2081 notice. 3) Print the admit card and sit the entrance test at the school.$$,
    $$NEB Grade 11, Science stream only, limited places. Date note: the latest notice found is for 2082 (form deadline 20 Ashad 2082, entrance test 22 Ashad 2082, posted Jun 29, 2025); the 2083 notice was not found. Earlier rounds were also in Ashad-Shrawan, so expect the next notice around June-July 2027; no date is confirmed. The school site bnks.edu.np blocks automated access, so this row links the educatenepal copy of the notice.$$,
    $$info@bnks.edu.np; 01-4370248 (reception); 01-4371637 (school gate), from an earlier notice$$,
    'https://www.educatenepal.com/notice-announcements/detail/budhanilkantha-school-announces-admission-for-neb-class-11'
  ),

  -- VERIFIED: mathsclub.ku.edu.np/events loaded Oct 11, 2026
  (
    'Kathmandu University Mathematics Club - Infinity School Competitions and Workshops',
    'Competition',
    $$The Kathmandu University Mathematics Students' Club (KUMSC) runs the annual Infinity math fest in September with school-level activities: a Mathematical Model Competition in two categories (Grades 8-10 and 11-12), mathematical games, high school workshops, and an Olympiad bootcamp led by past Nepal IMO participants. In 2024 it also hosted a Mathematics Olympiad with the Mathematical Association of Nepal (Sept 14, 2024).$$,
    'Kathmandu University Mathematics Students'' Club (KUMSC)',
    'https://mathsclub.ku.edu.np/events',
    null,
    null,
    null,
    'Kathmandu University, Dhulikhel, Kavre',
    false,
    'Mathematics',
    'Grades 8-12 (school competitions and workshops)',
    null,
    'A few days in September (2024: Sept 12-22)',
    'Mathematical modelling, problem solving, olympiad practice',
    'Intermediate',
    array['math','olympiad','competition','kathmandu university','workshop','school students'],
    null,
    $$No registration link was posted for a 2026 edition. Follow the club's pages linked from its website or email mathsclub@ku.edu.np and ask about Infinity 2026 registration for school students.$$,
    $$Date note: the club site listed no upcoming events on Oct 11, 2026, and its newest notices are from September 2025 (Infinity 2025 team named Sept 19, 2025). No 2026 Infinity dates were found, so the deadline is blank. The Mathematical Model Competition categories above are from the 2024 edition.$$,
    $$mathsclub@ku.edu.np; +977-9816386618; +977-9818715806$$,
    'https://mathsclub.ku.edu.np/events'
  )

) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, start_date = excluded.start_date,
  end_date = excluded.end_date, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  time_commitment = excluded.time_commitment, skills_gained = excluded.skills_gained,
  difficulty_level = excluded.difficulty_level, tags = excluded.tags,
  prep_resources = excluded.prep_resources, application_steps = excluded.application_steps,
  eligibility_details = excluded.eligibility_details, contact_info = excluded.contact_info,
  source_url = excluded.source_url;

-- =============================================================================
-- 6) COMPACT ROWS (YatraMap-sourced and corrected). Fields not listed here
--    (start/end dates, steps, contact, ...) are left as they already are.
--    registration_link falls back to the YatraMap detail page when blank;
--    source_url is always the YatraMap detail page.
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags, source_url
)
select
  title, type, description, organizer,
  coalesce(registration_link, 'https://yatramap.codeyatranp.com/opportunities/' || slug),
  deadline::date, location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags::text[],
  'https://yatramap.codeyatranp.com/opportunities/' || slug
from (values

  ($$Sony World Photography Awards - Youth Competition 2027$$, $$Competition$$, $$Free global photography competition for photographers aged 19 and under (up to three theme-related images). A shortlist of up to 10 is judged for the Youth Competition Winner title, which comes with Sony digital imaging equipment. The overall winner is announced in April 2027.$$, $$World Photography Organisation$$, $$sony-world-photography-awards-youth-2027$$, $$https://www.worldphoto.org/$$, '2027-01-05', $$Online$$, true, $$Arts$$, $$Ages 19 and under$$, $$Free$$, $$Open worldwide to anyone aged 19 or under on the closing date. Entry is free. Closes 5 Jan 2027, 16:00 GMT. The separate Student competition (ages 18-30, registered photography institutions) closes Nov 27, 2026 and is not for under-19 entrants.$$, array['photography','art','competition','online']),
  ($$Diamond Challenge 2027 - High School Entrepreneurship$$, $$Competition$$, $$Free global entrepreneurship competition for high school teams of 2-4 students aged 14-18. Teams choose a Business Innovation or Social Innovation track and submit a written concept and pitch video. Top teams pitch at the Diamond Challenge Summit at the University of Delaware (April 29-30, 2027). Total prizes exceed USD 100,000; grand prizes per track are USD 12,000, 8,000 and 4,500.$$, $$Horn Entrepreneurship, University of Delaware$$, $$diamond-challenge-2027-high-school-entrepreneurship$$, $$https://diamondchallenge.org/$$, '2027-01-14', $$Online$$, true, $$Business$$, $$Ages 14-18$$, $$Free$$, $$Teams of 2-4 high school students aged 14-18 at the submission deadline, enrolled in a secondary school or program. Students may team up across schools, join one team and submit one concept per year. Submission window opened Sept 16, 2026; concept narrative and pitch video are due Jan 14, 2027 at 5:00 PM EST; finalists are announced in March 2027.$$, array['entrepreneurship','business','competition','online']),
  ($$International Mathematical Olympiad (IMO) 2027 - Nepal Selection$$, $$Olympiad$$, $$Nepal's IMO team of 6 is chosen by the Mathematical Association of Nepal through multi-stage selection and special training at district, provincial and national level (3,000+ students took part in the 2024 selection). The 2026 team competed at the 67th IMO in Shanghai.$$, $$Mathematical Association of Nepal (MAN)$$, $$international-mathematical-olympiad-imo-2027-nepal$$, null, null, $$Nepal (district, provincial and national rounds)$$, false, $$Mathematics$$, $$High school students$$, null, $$Secondary school students selected through the district, provincial and national rounds. Round dates for the 2027 selection were not found: ask your school or check with the Mathematical Association of Nepal.$$, array['math','olympiad','nepal','STEM']),
  ($$International Physics Olympiad (IPhO) - Nepal Team Selection$$, $$Olympiad$$, $$Nepal's International Physics Olympiad team is chosen through the Nepal Physics Olympiad (NePhO), run by the Nepal Physical Society. In 2025/26 the pre-selection round produced 25 national champions, who attended a closed camp at Tribhuvan University (13-22 May 2026) with theory and experimental exams; the top five went to IPhO 2026 in Colombia.$$, $$Nepal Physical Society (NePhO committee), supported by the education ministry$$, $$international-physics-olympiad-nepal$$, $$https://nps.org.np/nepho-2/$$, null, $$Kathmandu (Tribhuvan University) plus pre-selection centers$$, false, $$Science$$, $$Secondary level (+2) science students$$, null, $$Pre-selection registration for 2026/27 had not been found on Oct 11, 2026; watch nps.org.np/nepho-2. Selected students need valid travel insurance for the camp and a passport for IPhO registration. Funding for travel has been uncertain in some years, so confirm costs with the committee.$$, array['physics','olympiad','nepal','STEM']),
  ($$International History Olympiad 2027$$, $$Olympiad$$, $$Biennial international history olympiad for primary and secondary school students, with quiz rounds, exams and historical games. The next edition is in July 2027 (location to be announced). Students qualify through the Olympiad Qualifying Exam or IAC History Bee/Bowl events.$$, $$International Academic Competitions (IAC)$$, $$international-history-olympiad-2027$$, $$https://www.historyolympiad.com/$$, null, $$Host city to be announced (July 2027)$$, false, $$Social Studies$$, $$Students who completed Grade 2 by July 2027 (divisions from Elementary to Varsity)$$, null, $$Open to students worldwide. Qualify through the Olympiad Qualifying Exam (available since Sept 2025) or IAC History Bee/Bowl tournaments. Registration for 2027 is expected to open in late 2026 and close around late June 2027. Registration fees cover events and field trips; meals and lodging are separate. Questions: olympiad@iacompetitions.com$$, array['history','olympiad','humanities']),
  ($$Trust for Sustainable Living International Student Competition 2027$$, $$Competition$$, $$Global sustainability competition for students aged 7-18, with creative entries and debate. Expected to open in early September 2026.$$, $$Trust for Sustainable Living$$, $$trust-for-sustainable-living-student-competition-2027$$, null, null, $$Online$$, true, $$Environment$$, $$Ages 7-18$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['sustainability','environment','competition','online']),
  ($$Conrad Challenge 2026-2027$$, $$Competition$$, $$Online innovation competition where student teams progress through activation, innovation and summit stages.$$, $$Conrad Foundation / Space Center Houston$$, $$conrad-challenge-2026-2027$$, null, null, $$Online$$, true, $$Technology$$, $$Student teams (check age bracket)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['innovation','STEM','teams','online']),
  ($$ITU Robotics for Good Youth Challenge 2026-27$$, $$Competition$$, $$UN-backed challenge for young people to design AI and robotics solutions to real-world problems such as health, with regional rounds and global finals at the AI for Good Global Summit.$$, $$ITU / AI for Good$$, $$itu-robotics-for-good-youth-challenge-2026$$, null, null, $$Online / global$$, true, $$Technology$$, $$Young people (check age bracket)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['robotics','AI','social good','UN']),
  ($$World Robot Olympiad (WRO)$$, $$Competition$$, $$Robotics competition drawing young participants from 90+ countries to build and program robots for themed challenges.$$, $$World Robot Olympiad International$$, $$world-robot-olympiad-wro-international-robotics-competition$$, $$https://wro-association.org/$$, null, $$Online$$, true, $$Technology$$, $$Young students (check age category)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['robotics','competition','STEM']),
  ($$picoCTF$$, $$Competition$$, $$Free, beginner-friendly cybersecurity capture-the-flag competition from Carnegie Mellon University CyLab, open to middle and high school students.$$, $$Carnegie Mellon University CyLab$$, $$picoctf-free-cybersecurity-competition-students$$, $$https://picoctf.org/$$, null, $$Online$$, true, $$Technology$$, $$Middle and high school students$$, $$Free$$, null, array['cybersecurity','CTF','coding','free']),
  ($$AnimalHack 2026$$, $$Hackathon$$, $$Free student-organized online hackathon for all ages and skill levels to build technology that improves human-animal relationships.$$, $$Binnovative / AnimalHack$$, $$animalhack-2026$$, null, null, $$Online$$, true, $$Technology$$, $$All ages and skill levels$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['hackathon','coding','animals','free']),
  ($$Banana Hacks 2026$$, $$Hackathon$$, $$Free, fully virtual generative-AI and image-creation hackathon with workshops, office hours and sponsor-supported compute credits.$$, $$Banana Hacks$$, $$banana-hacks-2026$$, null, null, $$Online$$, true, $$Technology$$, null, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['hackathon','AI','coding','free']),
  ($$Codeforces Global Rounds$$, $$Competition$$, $$Free, open-rated online programming contests that anyone worldwide can join.$$, $$Codeforces$$, $$codeforces-global-rounds-free-online-programming$$, $$https://codeforces.com/$$, null, $$Online$$, true, $$Technology$$, $$Open to anyone worldwide$$, $$Free$$, null, array['competitive programming','coding','free','online']),
  ($$AtCoder Beginner Contests$$, $$Competition$$, $$Free, beginner-friendly programming contests from Japan held every Saturday, open to anyone worldwide.$$, $$AtCoder Inc.$$, $$atcoder-beginner-contests-free-weekly-programming$$, $$https://atcoder.jp/$$, null, $$Online$$, true, $$Technology$$, $$Open to anyone worldwide$$, $$Free$$, null, array['competitive programming','coding','free','weekly']),
  ($$Model United Nations (MUN) - Global Conferences$$, $$Competition$$, $$Student-run simulations of the United Nations with hundreds of conferences worldwide (NMUN, HMUN, WorldMUN and others). Build diplomacy, research and public-speaking skills.$$, $$Various (NMUN, HMUN, WorldMUN and others)$$, $$model-united-nations-mun-global-conferences-for-students$$, null, null, $$Worldwide$$, false, $$Social Studies$$, $$Students (varies by conference)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['MUN','debate','leadership','diplomacy']),
  ($$YouthSpeak Forum 2026 - Kathmandu$$, $$Workshop$$, $$AIESEC youth leadership event on the UN Sustainable Development Goals. Free to attend, held in several cities including Kathmandu.$$, $$AIESEC$$, $$youthspeak-forum-2026-aiesec-youth-leadership$$, null, '2026-12-31', $$Kathmandu, Nepal$$, false, $$Leadership$$, $$Youth (check age requirement)$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['leadership','SDGs','youth','kathmandu']),
  ($$UNICEF U-Report Nepal$$, $$Opportunity$$, $$U-Report Nepal is UNICEF's youth polling and information chatbot on Viber (launched with Rakuten Viber). Young people share views through polls, get information on topics such as mental health, and results are shared with decision-makers. U-Report is open to ages 13-24.$$, $$UNICEF$$, $$unicef-u-report-nepal-youth-voice$$, $$https://www.unicef.org/nepal/press-releases/rakuten-viber-and-unicef-nepal-join-hands-empower-voices-children-and-youth-nepal$$, null, $$Online$$, true, $$Social Studies$$, $$Ages 13-24$$, $$Free$$, $$Free. Search for "U-Report Nepal" on Viber to subscribe. Check unicef.org/nepal or u-report.org for the current joining method.$$, array['youth voice','civic participation','nepal','online']),
  ($$WWF Nepal - Conservation Volunteer and Youth Programs$$, $$Volunteering$$, $$Conservation programs across Nepal including youth engagement, research internships and community-based wildlife monitoring.$$, $$WWF Nepal$$, $$wwf-nepal-conservation-volunteer-youth-programs$$, $$https://www.wwfnepal.org/$$, null, $$Nepal (Kathmandu, Chitwan, Bardia, Annapurna)$$, false, $$Environment$$, $$Check program age requirement$$, null, null, array['conservation','volunteering','environment','nepal']),
  ($$Goethe-Institut Kathmandu - German Courses and Study in Germany Info$$, $$Workshop$$, $$German language courses at all levels, Goethe-Zertifikat exams and information sessions about studying in Germany.$$, $$Goethe-Institut$$, $$goethe-institut-kathmandu-programs$$, null, null, $$Kathmandu, Nepal$$, false, $$Languages$$, null, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['german','language','study abroad','kathmandu']),
  ($$British Council Nepal - UK Scholarships and Advising$$, $$Opportunity$$, $$Scholarship information and free advising for Nepali students who want to study in the UK (Chevening, GREAT, Commonwealth and university-specific awards).$$, $$British Council Nepal$$, $$british-council-nepal-uk-scholarships-advising$$, $$https://www.britishcouncil.org.np/$$, null, $$Kathmandu, Nepal$$, false, $$Study Abroad$$, $$Students planning to study in the UK$$, $$Free advising$$, null, array['uk','study abroad','advising','scholarships','kathmandu']),
  ($$US Embassy Nepal - EducationUSA Advising$$, $$Opportunity$$, $$Free educational advising from the US Embassy in Kathmandu: US college applications, scholarships, visa preparation and programs for high-achieving, low-income students.$$, $$US Embassy Kathmandu / EducationUSA$$, $$us-embassy-nepal-educational-advising-opportunities$$, null, null, $$Kathmandu, Nepal$$, false, $$Study Abroad$$, $$Students planning to study in the US$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['usa','study abroad','advising','kathmandu']),
  ($$Matriculate - Free Virtual College Advising$$, $$Opportunity$$, $$Free virtual college advising from students at top universities for high-achieving students from low-income backgrounds; first-generation students prioritized.$$, $$Matriculate$$, $$matriculate-free-virtual-college-advising-low-income$$, $$https://www.matriculate.org/$$, null, $$Online$$, true, $$Study Abroad$$, $$High-achieving, low-income students$$, $$Free$$, null, array['college advising','mentoring','free','online']),
  ($$Harvard Summer School - Secondary School Program$$, $$Summer Program$$, $$Seven-week summer program where high school students take Harvard college courses for credit and experience university life.$$, $$Harvard University$$, $$harvard-summer-school-secondary-school-program-for-high-school-students$$, $$https://summer.harvard.edu/$$, null, $$Cambridge, Massachusetts, USA$$, false, $$Academic$$, $$High school students$$, null, null, array['summer program','harvard','usa','college credit']),
  ($$Stanford Summer Humanities Institute$$, $$Summer Program$$, $$Three-week residential summer program where high school students explore philosophy, literature and history with Stanford faculty.$$, $$Stanford University$$, $$stanford-summer-humanities-institute-philosophy-history-and-literature$$, null, null, $$Stanford, California, USA$$, false, $$Humanities$$, $$High school students$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['summer program','stanford','humanities','usa']),
  ($$UNSW International Scholarships - Term 1, 2027$$, $$Scholarship$$, $$Umbrella application for multiple UNSW awards for international students starting undergraduate or postgraduate coursework in Term 1, 2027.$$, $$University of New South Wales$$, $$unsw-international-scholarships-term-1-2027$$, $$https://www.scholarships.unsw.edu.au/scholarships/id/1988$$, '2026-10-30', $$UNSW Sydney, Australia$$, false, $$Any undergraduate program$$, $$International students commencing UNSW undergraduate (or postgraduate coursework) study in Term 1, 2027$$, null, $$One application (code PUCA1029) considers you for several awards, including the International Scientia Coursework Scholarship (full tuition or AUD 20,000 a year, reported). Closes 11:59 PM AEST on Oct 30, 2026. You may apply with a pending admission application, but any offer needs an unconditional UNSW offer first. Excludes UNSW Online and UNSW Canberra.$$, array['scholarship','australia','undergraduate']),
  ($$NYU Abu Dhabi Scholarships 2027$$, $$Scholarship$$, $$Need-based financial aid for international undergraduates at NYU Abu Dhabi, awarded to students who file the CSS Profile on time. NYUAD accepts aid applications from all students regardless of citizenship. Merit-based fellowships may also be offered.$$, $$New York University Abu Dhabi$$, $$nyu-abu-dhabi-scholarships-2027-financial-aid$$, $$https://nyuad.nyu.edu/en/admissions/undergraduate/scholarships-and-financial-aid.html$$, '2027-01-05', $$Abu Dhabi, UAE$$, false, $$Any undergraduate program$$, $$Grade 12 finishers (undergraduate entry)$$, null, $$Admission deadlines: Early Decision I Nov 1, Early Decision II Jan 1, Regular Decision Jan 5 (binding for Early Decision). Financial aid (CSS Profile, school code 2785) is due Nov 10 / Jan 10 / Feb 1 respectively. Aid amounts depend on demonstrated need; read the current NYUAD page before relying on any figure.$$, array['scholarship','uae','undergraduate','need-based']),
  ($$Stipendium Hungaricum Scholarship 2027$$, $$Scholarship$$, $$Hungarian government scholarship covering tuition, living costs and accommodation, from bachelor's to PhD.$$, $$Tempus Public Foundation, Hungary$$, $$stipendium-hungaricum-scholarship-2027$$, $$https://stipendiumhungaricum.hu/$$, '2027-01-15', $$Hungary$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: the 2027/28 Call for Applications was not published on Oct 11, 2026 (portal expected around Nov 2026). Jan 15, 2027 follows the 2026/27 deadline (Jan 15, 2026, 2 p.m. CET). You must also be nominated by your country's Sending Partner, so check that Nepal is on the partner list in the Call and what the Nepal-side deadline is.$$, array['scholarship','hungary','undergraduate','fully funded']),
  ($$Türkiye Scholarships (Türkiye Bursları) 2027$$, $$Scholarship$$, $$Turkish government scholarship covering tuition, living costs and flights for international students, bachelor's through PhD.$$, $$Presidency for Turks Abroad and Related Communities (YTB), Turkey$$, $$turkiye-scholarships-2027$$, $$https://turkiyeburslari.gov.tr/$$, '2027-02-20', $$Turkey$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: the 2027 call was not announced on Oct 11, 2026. The usual window is about Jan 10 to Feb 20, so the Feb 20, 2027 date is expected, not confirmed. Undergraduate applicants must be under 21 with at least 70% in their secondary school average (reported by several guides); apply only through the official portal, free of charge.$$, array['scholarship','turkey','undergraduate','fully funded']),
  ($$Chinese Government Scholarship (CSC) 2027$$, $$Scholarship$$, $$Full scholarships from China's Ministry of Education for international students: tuition, accommodation, living stipend and health insurance at Chinese universities.$$, $$China Scholarship Council (CSC)$$, $$chinese-government-scholarship-csc-2027$$, null, null, $$China$$, false, $$Any undergraduate program$$, $$International students (confirm level on the official site)$$, null, $$Date note: no 2027 call was found on Oct 11, 2026, and CSC dates vary by university and agency, so the previous Mar 1, 2027 date has been removed. Check campuschina.org / studyinchina.csc.edu.cn and the Chinese embassy in Kathmandu.$$, array['scholarship','china','fully funded']),
  ($$Wells Mountain Initiative (WMI) Scholarship 2027$$, $$Scholarship$$, $$Partial undergraduate scholarship (up to USD 3,000 a year) for students from developing countries to study their first undergraduate degree or diploma in their home country or region. Supports tuition and fees, books and materials and related costs, for all years of the degree. The 2027 application is available from December 1, 2026.$$, $$Wells Mountain Initiative$$, $$wells-mountain-initiative-wmi-scholarship-2027$$, null, '2027-03-01', $$Home country or region$$, false, $$Any undergraduate program$$, $$Students in developing countries$$, null, $$Open to students 35 or younger on Aug 1, 2027 who are applying to university or in their first undergraduate degree or diploma. Not available for study in the US, Canada, Australia, UK or Western Europe. Application: essay, form and two recommendation letters. Closes Mar 1, 2027 at 11:59 PM EST; recipients are notified by Aug 1, 2027. Confirm Nepal's inclusion and the current application site before applying.$$, array['scholarship','developing countries','undergraduate']),
  ($$Indonesian Government KNB Scholarship$$, $$Scholarship$$, $$Fully funded bachelor's, master's or PhD study in Indonesia for students from developing countries including Nepal.$$, $$Government of Indonesia / Ministry of Education$$, $$indonesian-government-knb-scholarship-fully-funded-study-in-indonesia$$, null, null, $$Indonesia$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: no 2027 call was found on Oct 11, 2026, so the previous Apr 15, 2027 date has been removed. Confirm Nepal's eligibility and dates on the official KNB site and with the Indonesian embassy.$$, array['scholarship','indonesia','fully funded']),
  ($$University of South Wales Scholarship for Nepali Students$$, $$Scholarship$$, $$£2,500 per year for self-funding Nepali students on eligible undergraduate and postgraduate programmes.$$, $$University of South Wales$$, $$south-wales-scholarship-nepal-2026-27$$, null, null, $$Wales, United Kingdom$$, false, $$Any undergraduate program$$, $$Nepali students (undergraduate and postgraduate)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','uk','nepal','undergraduate']),
  ($$Newcastle University Scholarships for Nepali Students$$, $$Scholarship$$, $$Undergraduate and master's funding options for eligible Nepali applicants (2026 entry listed).$$, $$Newcastle University$$, $$newcastle-university-scholarships-nepali-students-2026$$, null, null, $$Newcastle upon Tyne, United Kingdom$$, false, $$Any undergraduate program$$, $$Nepali students (undergraduate and postgraduate)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','uk','nepal','undergraduate']),
  ($$Aalto University Scholarships$$, $$Scholarship$$, $$Tuition waivers of 50-100% for non-EU students on bachelor's and master's programmes in technology, business and arts.$$, $$Aalto University$$, $$aalto-university-scholarships-finland$$, null, null, $$Espoo, Finland$$, false, $$Technology, Business and Arts$$, $$Bachelor's and master's applicants$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','finland','undergraduate','tuition waiver']),
  ($$Ashesi University Scholarships$$, $$Scholarship$$, $$Need- and merit-based undergraduate scholarships covering tuition and living expenses at Ashesi University in Ghana.$$, $$Ashesi University$$, $$ashesi-university-scholarships-ghana-undergraduate$$, null, null, $$Berekuso, Ghana$$, false, $$Any undergraduate program$$, $$Undergraduate applicants$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','ghana','undergraduate'])

) as v(
  title, type, description, organizer, slug, registration_link, deadline,
  location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  eligibility_details = excluded.eligibility_details, tags = excluded.tags,
  source_url = excluded.source_url;

drop index if exists public.opportunities_title_key;

notify pgrst, 'reload schema';
