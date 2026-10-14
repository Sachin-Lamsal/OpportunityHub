-- =============================================================================
-- OpportunityHub — seed-opportunities PART 3: OFFICIAL REGISTRATION LINKS
-- Run AFTER seed-opportunities.sql (part 1) AND seed-opportunities-part2.sql.
-- Safe to re-run.
--
-- What this file does
--   A) Removes rows whose existence could not be confirmed or that do not apply
--   B) Renames three rows whose names were wrong
--   C) Applies corrections found while locating the official pages
--   D) Adds one new row (HMUN Online)
--   E) Sets registration_link AND source_url to the official page for every row
--      (no YatraMap, news-site or aggregator link is left in either column)
--
-- Checked Oct 11, 2026. Where only the organizer's home page could be confirmed,
-- that home page is used; those rows are listed in the summary message.
-- =============================================================================

-- =============================================================================
-- A) REMOVALS
-- =============================================================================
-- AnimalHack: only the 2023 edition could be confirmed; no 2026 edition found.
-- Banana Hacks: no hackathon of that name found (only Google's 2025 Nano Banana event).
-- YouthSpeak Forum Kathmandu: no 2026 Kathmandu edition found; AIESEC events target ages 18-30.
-- Ashesi: the flagship scholarship (Mastercard Foundation) is for African students only.
delete from public.opportunities
where title in (
  'AnimalHack 2026',
  'Banana Hacks 2026',
  'YouthSpeak Forum 2026 - Kathmandu',
  'Ashesi University Scholarships'
);

-- =============================================================================
-- B) RENAMES (wrong names in the YatraMap listing)
-- =============================================================================
-- "MUN Global Conferences" mixed university conferences (NMUN, WorldMUN) with a high-school one.
update public.opportunities set
  title = 'Harvard Model United Nations (HMUN) 2027 - Boston'
where title = 'Model United Nations (MUN) - Global Conferences';

-- Nepal's EducationUSA center is run by USEF-Nepal (the Fulbright Commission), not the US Embassy.
update public.opportunities set
  title = 'EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising'
where title = 'US Embassy Nepal - EducationUSA Advising';

-- The German language center in Kathmandu is the Goethe-Zentrum Kathmandu (official partner).
update public.opportunities set
  title = 'Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams'
where title = 'Goethe-Institut Kathmandu - German Courses and Study in Germany Info';

-- =============================================================================
-- C) CORRECTIONS FOUND WHILE LOCATING OFFICIAL PAGES
-- =============================================================================

-- Harvard MUN: official HMUN pages
update public.opportunities set
  type = 'Competition',
  organizer = 'Harvard Model United Nations (run by Harvard College students)',
  description = $$Four-day Model UN simulation for high school students at the Boston Sheraton and Marriott Copley Place, with more than 3,000 delegates from hundreds of schools around the world. Delegates play world leaders and draft resolutions in General Assemblies, specialized bodies and crisis committees.$$,
  deadline = '2026-12-01',
  start_date = '2027-01-28',
  end_date = '2027-01-31',
  location = 'Boston, Massachusetts, USA',
  is_online = false,
  subject_area = 'Social Studies',
  grade_requirements = 'High school students aged 13 or older (enrolled in, or recently graduated from, high school)',
  cost = $$Delegate fee US $115 (by Oct 1), $130 (by Nov 1) or $210 (by Dec 15, 2026), plus travel and hotel$$,
  time_commitment = 'Four-day conference plus country research beforehand',
  skills_gained = 'Diplomacy, research, public speaking, negotiation',
  difficulty_level = 'Intermediate',
  tags = array['MUN','debate','diplomacy','harvard','usa','high school'],
  application_steps = $$1) A school advisor registers the delegation on harvardmun.org. 2) Registration deadlines: priority Sept 1, general Oct 1, late Dec 1, 2026. 3) Acceptance is not guaranteed, so do not book travel before you are confirmed. 4) Pay the delegate fee by the stated dates and receive your country assignment.$$,
  eligibility_details = $$Open to high school students 13 or older, including those who graduate before the conference, but not to college students. Participation is through school delegations, and acceptance is competitive. HMUN Online (a cheaper virtual version) is listed separately.$$,
  contact_info = null
where title = 'Harvard Model United Nations (HMUN) 2027 - Boston';

-- EducationUSA Nepal: run by USEF-Nepal
update public.opportunities set
  organizer = 'U.S. Educational Foundation in Nepal (USEF-Nepal / Fulbright Commission)',
  description = $$Nepal's official EducationUSA Advising Center in central Kathmandu, run by USEF-Nepal and supported by the US Department of State. Offers free core advising on US college applications, a library and testing services, hosts the EducationUSA South Asia Tour each fall and spring, and runs the EducationUSA Opportunity Funds Program for high-achieving students from non-elite, disadvantaged backgrounds.$$,
  location = 'Gyaneshwor, Kathmandu',
  grade_requirements = 'Students planning to study in the US (any grade)',
  cost = 'Core advising is free',
  eligibility_details = $$Open to prospective students and parents. Opportunity Funds is selective and aimed at students from disadvantaged backgrounds. Book advising appointments through the USEF-Nepal site or the EducationUSA Nepal app.$$
where title = 'EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising';

-- Goethe-Zentrum Kathmandu
update public.opportunities set
  organizer = 'Goethe-Zentrum Kathmandu (official partner of the Goethe-Institut e.V.)',
  description = $$Leading German language center in Nepal and the only authorized exam center for Goethe-Institut exams (A1-B2) in the country. Courses run from A1 to C1 in line with the Common European Framework. Registration is on the center's website.$$,
  location = 'Ekantakuna Height, Lalitpur (previously Thapathali), Kathmandu Valley',
  contact_info = $$reception@goethe-kathmandu.edu.np | exam@goethe-kathmandu.edu.np$$,
  eligibility_details = $$The center describes its services as courses and exams for adults and asks for proof of age at registration, so confirm the minimum age with them before enrolling a student under 18. Exam fees are not included in course fees, and refunds are not possible once paid.$$
where title = 'Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams';

-- Conrad Challenge: official 2026-27 student guide
update public.opportunities set
  description = $$Year-long entrepreneurship and innovation competition for high school student teams (2-5 students, ages 13-18, from any country). Teams design an innovation addressing a global challenge, build a business plan and pitch video, and top teams present at the Innovation Summit at Space Center Houston.$$,
  deadline = '2026-10-29',
  start_date = '2026-08-27',
  end_date = '2027-04-24',
  grade_requirements = 'Ages 13-18, in high school or officially homeschooled; teams of 2-5',
  cost = $$No fee to register and submit the first stage. A per-team fee applies at the Innovation Stage (USD 499 in 2025-26; confirm for 2026-27)$$,
  time_commitment = 'Aug 2026 - Apr 2027',
  application_steps = $$1) Register your whole team and a coach on the Conrad Challenge portal (conradchallenge.awardsplatform.com) between Aug 27 and Oct 29, 2026. 2) Finalize your team and innovation name and submit the Lean Canvas by Oct 29, 2026. 3) Innovation Stage submission due Jan 7, 2027 (online). 4) Finalists announced Feb 26, 2027; Innovation Summit Apr 21-24, 2027 in Houston.$$,
  eligibility_details = $$Registration window: Aug 27 - Oct 29, 2026 (Activation Stage due Oct 29-30 depending on the page; use Oct 29). Teams can mix students from different schools and countries. The competition does not award cash prizes. Contact: info@conradchallenge.org$$
where title = 'Conrad Challenge 2026-2027';

-- ITU Robotics for Good Youth Challenge: official page
update public.opportunities set
  description = $$UN-backed (ITU) youth challenge: teams design, build and program a robot for a mission based on a global challenge, with the 2026-27 theme of health emergencies (with WHO). Platform-agnostic, so teams can use locally sourced hardware. National and regional events feed the Grand Finale during the AI for Good Global Summit in Geneva, June 22-25, 2027.$$,
  deadline = '2027-04-01',
  start_date = '2026-10-01',
  end_date = '2027-06-25',
  location = 'National events in participating countries; online route; Grand Finale in Geneva',
  grade_requirements = 'Junior team: born 2012-2016. Senior team: born 2008-2011',
  eligibility_details = $$In-person participation depends on a National Organizer hosting a Local Chapter event in your country (period Oct 1, 2026 - Apr 1, 2027). Online participation: video and application form are due April 1, 2027. Nepal's chapter was run by the Robotics Association of Nepal for the 2025 final (Nepal's junior team placed second in Geneva in 2025); confirm with them whether a 2026-27 Nepal event is planned.$$
where title = 'ITU Robotics for Good Youth Challenge 2026-27';

-- Trust for Sustainable Living: official site; 2027 date not yet published
update public.opportunities set
  description = $$Free international student competition from the UK charity Trust for Sustainable Living, with a yearly sustainability theme (2026 theme: "Sustainability Culture"). Students submit essays, art, music, video or other creative pieces; top entries are invited to the International Student Debates. The 2026 edition received a record 2,710 entries from schools worldwide.$$,
  deadline = null,
  grade_requirements = 'Primary and secondary school students (teachers register as Teacher Champions)',
  eligibility_details = $$Date note: the 2026 entry deadline was Mar 1, 2026. TSL's site says registration for the next competition opens in September 2026; the 2027 theme and deadline were not found on the official site yet, so the deadline is blank. Teachers (or parents as Teacher Champions) register and submit student entries; written entries are limited to 600 words and audio/video to 3 minutes.$$
where title = 'Trust for Sustainable Living International Student Competition 2027';

-- IMO Nepal: Mathematical Association of Nepal official pipeline
update public.opportunities set
  registration_link = 'https://mathassociationnepal.org.np/',
  description = $$Nepal's International Mathematical Olympiad team of 6 is chosen by the Mathematical Association of Nepal (MAN), the official national representative for the IMO. The path is District Olympiad (DMO) -> Provincial (PMO) -> National (NMO, top 30) -> Team Selection Test -> IMO. The 2026 team competed at the 67th IMO in Shanghai.$$,
  grade_requirements = 'Students in Grades 8-12',
  eligibility_details = $$The DMO is held in all 77 districts: 50 multiple-choice questions in 100 minutes, with 25 or more (50%) needed to advance. MAN's site says DMO registration is open for Academic Year 2026; earlier DMO registration used an online form posted on MAN's notices page. Exact 2027 round dates were not found: check the notices page at mathassociationnepal.org.np/notices or ask your school.$$
where title = 'International Mathematical Olympiad (IMO) 2027 - Nepal Selection';

-- Aalto: official scholarship page
update public.opportunities set
  description = $$Tuition-fee waivers (50% or 100%) for non-EU/EEA students admitted to English-taught bachelor's and master's programs at Aalto University in Finland. There is no separate scholarship application: you tick the scholarship option on the admission application. Bachelor's tuition is EUR 12,000 a year for business and technology programs (reported), so the waiver can be large.$$,
  deadline = '2027-01-22',
  eligibility_details = $$Only students liable for tuition fees (non-EU/EEA citizens) can apply, and only on the admission form during the application period. The bachelor's application window for autumn 2027 is reported as Jan 7-22, 2027 (Finnish time); confirm on aalto.fi before the window. Aalto offers no university-wide scholarships for living costs.$$
where title = 'Aalto University Scholarships';

-- Newcastle: Vice-Chancellor's International Scholarship, Nepal is on the eligible list
update public.opportunities set
  description = $$Newcastle University's Vice-Chancellor's International Scholarships give GBP 7,000 per academic year toward tuition for the length of an undergraduate course. Nepal is on the eligible country list. Awards are made automatically to eligible students who hold an offer, with no separate application.$$,
  deadline = '2027-01-13',
  eligibility_details = $$For 2027/28 entry: apply to Newcastle through UCAS by Jan 13, 2027; if you receive an offer by Mar 31, 2027 you must accept Newcastle as Firm or Insurance choice by May 3, 2027. You must be assessed as an international fee payer, hold an offer for an eligible degree at the Newcastle city-centre campus, and be domiciled in an eligible country. Not available to INTO pathway students, current students or repeat-year students. Email: scholarship.applications@newcastle.ac.uk$$
where title = 'Newcastle University Scholarships for Nepali Students';

-- University of South Wales: official Nepal page
update public.opportunities set
  description = $$Self-funding Nepali students at the University of South Wales receive GBP 2,500 per year toward undergraduate or postgraduate tuition (courses starting Sept 2026 and Feb 2027), considered automatically when you apply. Students based in Nepal must pay 100% of tuition to be eligible for a CAS.$$,
  eligibility_details = $$Direct entry to an undergraduate degree is considered for NEB/HSEB/CBSE/HSC Class 12 graduates with 65% or above. A separate listing says the amount rises to GBP 3,000 if you receive your CAS by May 31; confirm on USW's page. The page lists a Kathmandu office at Buddhanagar-10, New Baneshwor. Check the page for 2027 start dates, as the posted dates cover Sept 2026 and Feb 2027 intakes.$$
where title = 'University of South Wales Scholarship for Nepali Students';

-- KNB: official portal and 2026/27 timeline
update public.opportunities set
  description = $$Fully funded Indonesian government scholarship (Kemitraan Negara Berkembang) for students from developing countries to study a bachelor's, master's or doctorate at one of 47 Indonesian host universities (about 200 awards in 2026). Applications go through the official KNB portal after you obtain a recommendation letter from the Indonesian Embassy.$$,
  eligibility_details = $$Date note: the 2026/27 call ran Feb 2 - Mar 31, 2026; no 2027/28 call has been announced, so the deadline is blank. Bachelor's applicants must be 21 or younger on Dec 31 of the call year, hold a valid official passport and have a recommendation letter from the Indonesian embassy covering their country (for Nepal, the Embassy of Indonesia in Kathmandu).$$
where title = 'Indonesian Government KNB Scholarship';

-- Stanford Summer Humanities Institute: official site
update public.opportunities set
  description = $$Three-week residential summer program at Stanford for rising high school juniors and seniors (grades 10-11). Students take college-level humanities seminars with Stanford faculty and write college-level papers. Tuition was USD 8,850 in 2026, and need-based financial aid (partial or full) is open to international applicants.$$,
  deadline = null,
  grade_requirements = 'Grades 10-11 (rising juniors and seniors)',
  cost = $$USD 8,850 tuition (2026); USD 65 application fee; need-based aid available$$,
  eligibility_details = $$Date note: the 2026 application is closed and the 2027 application was not open on Oct 11, 2026. Deadlines have fallen in early February (2026 financial-aid deadline: Feb 9). Aid requires the SSS Parents' Financial Statement and, for international families, the SSS International Student Financial Aid Profile (Stanford Pre-Collegiate Studies school code 200189).$$
where title = 'Stanford Summer Humanities Institute';

-- WMI: official application platform and contact
update public.opportunities set
  contact_info = $$info@wellsmountaininitiative.org (no fee is ever required to apply). Applications are submitted on WMI's official platform: apply.mykaleidoscope.com$$
where title = 'Wells Mountain Initiative (WMI) Scholarship 2027';

-- KMC: the date pattern changes yearly
update public.opportunities set
  eligibility_details = $$Date note: the 2083/84 cycle is finished (applications Jestha 1-10, 2083; exam Jestha 17, 2083). The window moves between years: the 2082/83 round ran applications Ashad 18-27, 2082 and the exam on Shrawan 3, 2082, while 2083/84 ran in Jestha. Expect the next notice somewhere between Baisakh and Ashad 2084 (about April-July 2027); no date is confirmed. Eligibility has centred on permanent residents of Kathmandu Metropolitan City who finished SEE at a community school, or at a private school on a scholarship. Rules, documents and reservation categories change each year, so read the current notice on kathmandu.gov.np or entrance.kathmandu.gov.np.$$
where title = 'Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)';

-- PTAP: correct the publication date; official ministry notice
update public.opportunities set
  description = $$Government of Pakistan scholarships for Nepali students, offered through Nepal's Ministry of Education and Sports, for B.Sc. Engineering (Civil, Computer and Electrical: 2 seats each, with one seat per subject reserved for a female candidate) and D Pharmacy (8 seats) for 2026-27. Selection uses the IOE Pulchowk entrance examination merit list. Applications go through a Google Form linked from the ministry's notice.$$,
  eligibility_details = $$Date note: the ministry notice is dated Asar 22, 2083 (about Jul 6, 2026) and was reported on Jul 9, 2026; no deadline was recorded. The next call is expected after the 2027 IOE results (about Jul-Aug 2027). You must have passed Grade 12 (or equivalent) and be on the IOE entrance results. Documents: academic transcript, Nepali citizenship certificate and IOE score card. Contact: Scholarship Branch, Ministry of Education and Sports, Sanothimi, Bhaktapur (01-6634842).$$
where title = 'Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy';

-- President Running Shield: latest editions
update public.opportunities set
  description = $$The National Sports Council's biggest junior (under-18) sports competition. Athletes are selected through municipality and district rounds, then at province level, and each province sends a team to the central tournament in Kathmandu. The 15th edition ran May 28-30, 2025 and the 16th ran Jestha 20-22, 2083 (early June 2026), with six sports (athletics, volleyball, kabaddi, karate, taekwondo, wushu) and 66 gold medals. The Koshi province round in 2026 drew 1,700 players selected from all 14 districts.$$,
  eligibility_details = $$Date note: the 17th edition has not been announced, so no date is shown. Recent editions ran in May-June, with district and provincial selection in the weeks before. Participation is through school, municipality and district sports bodies, so ask your school sports teacher or district sports development committee. NSC's own site (nsc.gov.np) has often been out of date, so confirm schedules with your provincial sports development board.$$
where title = 'President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)';

-- KUUMAT: official portal and eligibility
update public.opportunities set
  application_steps = $$1) Watch som.ku.edu.np and ku.edu.np for the call (2025 deadline was Aug 8 with the test Aug 15; 2026's test was Jul 20). 2) Apply online on the KUSOM admission portal (som-admportal.ku.edu.np). 3) Sit KUUMAT and apply to KUSOM or an affiliated college using your score.$$,
  eligibility_details = $$Date note: the Fall 2026 round is finished (KUUMAT held Jul 20, 2026). Timing moves between years (June-August), and no Fall 2027 date is confirmed. Eligibility per KUUMAT guides: +2, intermediate or equivalent with at least 50% aggregate or CGPA 2.0 on a 4-point scale from a recognized board. Read the current call for the latest rule.$$
where title = 'Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)';

-- Pokhara University: official portal and quota
update public.opportunities set
  description = $$Pokhara University's Faculty of Science and Technology, Faculty of Management Studies and Faculty of Humanities and Social Sciences invite bachelor-level scholarship applications at constituent, joint constituent and affiliated colleges. The 2083 notice listed 1,381 scholarship quotas (558 in science and technology), for example BE Civil (183), BE Computer (107), BCSIT (94), BE IT (53) and BE Software (29). Applications go through the university's scholarship portal.$$,
  deadline = null,
  eligibility_details = $$Date note: the 2083 round is finished (online application until Asar 14, 2083, about Jun 28, 2026; exams around Asar 20-21, 2083). The next round is expected about mid-2027; earlier rounds ran in Shrawan 2081 and Asar 2083, so check scholarship.pu.edu.np. Nepali citizens meeting the minimum qualifications under the Pokhara University Scholarship Regulations can apply; open and reserved quotas exist.$$
where title = 'Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083';

-- UWC Nepal: application page details
update public.opportunities set
  cost = $$No application fee or recommendation letters are required to submit the application; finalists are asked to pay a fee later (per the 2025 FAQ; confirm for 2027). Scholarship covers full or partial cost based on family finances.$$,
  application_steps = $$1) Create an account on the UWC application portal and open the "UWC Nepal NC - Entry 2027" application (np.uwc.org/how-to-apply/application-form). 2) Complete the whole form before Oct 31, 2026, 11:59 PM Nepal time (an incomplete application is disqualified). 3) First stage: the committee reviews forms (Nov 6-18); first-interview names are published Nov 20. 4) Second stage: written exam, group activities and interview (Nov 28-29). 5) Final stage: interview and group activities (Dec 12); results Jan 8, 2027; nominated names go to UWC Jan 31 - Feb 28, 2027.$$
where title = 'UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)';

-- MGSS / GJSS: official portal named in Embassy notices
update public.opportunities set
  application_steps = $$1) Watch the Embassy of India (indembkathmandu.gov.in) for the MGSS-GJSS notice, usually in Oct-Nov. 2) Apply online on the web portal named in the Embassy notice (www.goischolarship.com.np). 3) Upload your Class 10 mark sheet, proof of Class 11 enrolment attested by the principal (stating no other scholarship) and proof of Nepali citizenship. 4) Send later documents (Class 11 result, Class 12 status letter) to attacheedu.kathmandu@mea.gov.in by Dec 31 each year.$$
where title = 'Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11';

update public.opportunities set
  application_steps = $$1) Watch the Embassy of India (indembkathmandu.gov.in) for the MGSS-GJSS notice, usually in Oct-Nov. 2) Apply online on the web portal named in the Embassy notice (www.goischolarship.com.np). 3) Upload your Class 12 mark sheet and proof of Nepali citizenship, plus the admission and enrolment documents the notice lists. 4) Send later documents to attacheedu.kathmandu@mea.gov.in by Dec 31 each year.$$
where title = 'Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate';

-- Fix the generic "listing-only" note on rows now checked against official pages
update public.opportunities set
  eligibility_details = $$Checked against the organizer's official site on Oct 11, 2026 for existence and registration page. Confirm eligibility and the current year's dates there before applying.$$
where title in (
    'World Robot Olympiad (WRO)',
    'Matriculate - Free Virtual College Advising',
    'Harvard Summer School - Secondary School Program',
    'British Council Nepal - UK Scholarships and Advising'
  )
  and (eligibility_details is null or eligibility_details like 'Listing-only entry%');

-- =============================================================================
-- D) NEW ROW
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
  (
    'HMUN Online 2027 (Harvard Model United Nations - virtual)',
    'Competition',
    $$Virtual version of Harvard Model United Nations for high school students, run in sessions so delegates anywhere can take part without travelling to Boston. The 2026-27 registration timeline has an early-bird date, a Session I deadline and a Session II deadline.$$,
    'Harvard Model United Nations (run by Harvard College students)',
    'https://www.harvardmun.org/hmun-online/application-process',
    '2026-11-06',
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'High school students aged 13 or older (enrolled in, or recently graduated from, high school)',
    $$Delegate fee US $50 (early bird) or US $75 (regular)$$,
    'Short online conference plus preparation',
    'Diplomacy, research, public speaking',
    'Intermediate',
    array['MUN','debate','diplomacy','harvard','online','high school'],
    null,
    $$1) Register on the HMUN Online application page. 2) Registration deadlines for 2026-27: early bird July 10, 2026 (passed), Session I Sept 13, 2026 (passed), Session II Nov 6, 2026. 3) Pay the delegate fee and complete your assignment prep.$$,
    $$Open to high school students aged 13 or older, including recent graduates, but not to college students. The deadline shown is the last published registration date (Session II); session dates were not captured, so check the page for them.$$,
    null,
    'https://www.harvardmun.org/hmun-online/application-process'
  )
) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
where not exists (
  select 1 from public.opportunities o where o.title = v.title
);

-- =============================================================================
-- E) OFFICIAL REGISTRATION LINK (and source) FOR EVERY ROW
-- =============================================================================
update public.opportunities o set
  registration_link = v.url,
  source_url = v.url
from (values

  -- ---- Part 1: verified rows -------------------------------------------------
  ('NASA Space Apps Challenge 2026', 'https://www.spaceappschallenge.org/2026/'),
  ('Cliburn International Competition for Young Pianists 2027', 'https://cliburn.org/competitions/2027-young-pianists/application-and-rules'),
  ('YIRA Global Essay Competition 2027 (Yale)', 'https://www.yira.org/'),
  ('Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11', 'https://www.goischolarship.com.np/'),
  ('Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate', 'https://www.goischolarship.com.np/'),
  ('Lester B. Pearson International Scholarship 2027 (University of Toronto)', 'https://www.future.utoronto.ca/pearson'),
  ('UBC International Scholars Program 2027', 'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/'),
  ('National Astronomy Olympiad (NAO) - Nepal', 'https://www.nepalastronomicalsociety.org/projects/olympiad/'),

  -- ---- Part 1: previously listing-only rows ---------------------------------
  ('Sony World Photography Awards - Youth Competition 2027', 'https://www.worldphoto.org/'),
  ('Diamond Challenge 2027 - High School Entrepreneurship', 'https://diamondchallenge.org/'),
  ('Global Game Jam 2027', 'https://globalgamejam.org/'),
  ('International Mathematical Olympiad (IMO) 2027 - Nepal Selection', 'https://mathassociationnepal.org.np/'),
  ('International Physics Olympiad (IPhO) - Nepal Team Selection', 'https://nps.org.np/nepho-2/'),
  ('International History Olympiad 2027', 'https://www.historyolympiad.com/'),
  ('Trust for Sustainable Living International Student Competition 2027', 'https://trustforsustainableliving.org/'),
  ('Conrad Challenge 2026-2027', 'https://conradchallenge.awardsplatform.com/'),
  ('ITU Robotics for Good Youth Challenge 2026-27', 'https://aiforgood.itu.int/robotics-for-good-youth-challenge/'),
  ('World Robot Olympiad (WRO)', 'https://wro-association.org/'),
  ('picoCTF', 'https://picoctf.org/'),
  ('Codeforces Global Rounds', 'https://codeforces.com/'),
  ('AtCoder Beginner Contests', 'https://atcoder.jp/'),
  ('Harvard Model United Nations (HMUN) 2027 - Boston', 'https://www.harvardmun.org/application-process'),
  ('UNICEF U-Report Nepal', 'https://www.u-report.org/how-to-join-u-report'),
  ('WWF Nepal - Conservation Volunteer and Youth Programs', 'https://www.wwfnepal.org/'),
  ('Japan Resource Center (JRC) - Embassy of Japan, Kathmandu', 'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00138.html'),
  ('Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams', 'https://www.goethe-kathmandu.edu.np/'),
  ('British Council Nepal - UK Scholarships and Advising', 'https://www.britishcouncil.org.np/'),
  ('EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising', 'https://usefnepal.org/education-usa/study-in-the-usa/'),
  ('Matriculate - Free Virtual College Advising', 'https://www.matriculate.org/'),
  ('Harvard Summer School - Secondary School Program', 'https://summer.harvard.edu/'),
  ('Stanford Summer Humanities Institute', 'https://summerhumanities.spcs.stanford.edu/'),
  ('UNSW International Scholarships - Term 1, 2027', 'https://www.scholarships.unsw.edu.au/scholarships/id/1988'),
  ('NYU Abu Dhabi Scholarships 2027', 'https://nyuad.nyu.edu/en/admissions/undergraduate/scholarships-and-financial-aid.html'),
  ('Stipendium Hungaricum Scholarship 2027', 'https://stipendiumhungaricum.hu/'),
  ('Türkiye Scholarships (Türkiye Bursları) 2027', 'https://turkiyeburslari.gov.tr/'),
  ('Chinese Government Scholarship (CSC) 2027', 'https://www.campuschina.org/'),
  ('Wells Mountain Initiative (WMI) Scholarship 2027', 'https://www.wellsmountaininitiative.org/'),
  ('Indonesian Government KNB Scholarship', 'https://knb.kemdiktisaintek.go.id/'),
  ('University of South Wales Scholarship for Nepali Students', 'https://www.southwales.ac.uk/international/your-country/nepal/'),
  ('Newcastle University Scholarships for Nepali Students', 'https://www.ncl.ac.uk/undergraduate/fees-funding/scholarships-bursaries/vc-international'),
  ('Aalto University Scholarships', 'https://www.aalto.fi/en/international-students/scholarships-study-right-started-on-or-after-1-august-2025'),

  -- ---- Part 2: new rows -----------------------------------------------------
  ('Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)', 'https://entrance.kathmandu.gov.np/'),
  ('Atal Bihari Vajpayee General Scholarship Scheme (ABVGSS) - ICCR, Undergraduate in India', 'https://a2ascholarships.iccr.gov.in/'),
  ('Japanese Government (MEXT) Scholarship - Undergraduate (Embassy of Japan in Nepal)', 'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html'),
  ('Kathmandu University Provincial Government Tuition Scholarships (Bagmati, Gandaki, Karnali, Madhesh)', 'https://ku.edu.np/news-app'),
  ('Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy', 'https://moest.gov.np/content/13636/information-regarding-scholarship/'),
  ('Nepal Government Engineering Scholarship (IOE Merit List) - Education Ministry', 'https://moest.gov.np/'),
  ('MECEE-BL - Medical Education Common Entrance Exam (MBBS, BDS, Nursing and other health programs)', 'https://entrance.mec.gov.np/'),
  ('TU Institute of Engineering (IOE) BE/BArch Entrance Examination', 'https://entrance.ioe.edu.np/'),
  ('Asian Paints Champions Cup - Inter-School U-18 National Football Tournament (Boys and Girls)', 'https://www.championscuptht.com/'),
  ('President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)', 'https://nsc.gov.np/'),
  ('UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)', 'https://np.uwc.org/how-to-apply/application-form'),
  ('Yale Young Global Scholars (YYGS) 2027 - need-based financial aid', 'https://globalscholars.yale.edu/'),
  ('Research Science Institute (RSI) 2027 - MIT and Stanford', 'https://www.cee.org/programs/research-science-institute'),
  ('Technovation Girls 2027 Season - Build an App or AI Solution', 'https://technovationchallenge.org/get-involved/students'),
  ('Yale Review of International Studies (YRIS) High School Essay Contest', 'https://yris.yira.org/submit'),
  ('Kathmandu University KUCAT-CBT - Undergraduate Engineering and Science Admission', 'https://apply.ku.edu.np/'),
  ('Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)', 'https://som-admportal.ku.edu.np'),
  ('St. Xavier''s College (Maitighar) Class 11 Science Admission and KMC Scholarship Seats', 'https://sxc.edu.np/'),
  ('Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083', 'https://scholarship.pu.edu.np'),
  ('COMPEX Scholarship Scheme - Embassy of India, Kathmandu (Undergraduate Courses in India)', 'https://www.indembkathmandu.gov.in/about-education-and-scholarship'),

  -- ---- Part 3: new row ------------------------------------------------------
  ('HMUN Online 2027 (Harvard Model United Nations - virtual)', 'https://www.harvardmun.org/hmun-online/application-process')

) as v(title, url)
where o.title = v.title;

notify pgrst, 'reload schema';
