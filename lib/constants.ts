export const APP_NAME = "OpportunityHub";

export const ACCOUNT_TYPES = ["student", "school", "organization"] as const;

export const ACCOUNT_TYPE_LABELS: Record<
  (typeof ACCOUNT_TYPES)[number],
  string
> = {
  student: "Student",
  school: "School",
  organization: "Organization",
};

export const LOGIN_PORTAL_CARDS = [
  {
    accountType: "student" as const,
    title: "Student",
    description:
      "Discover opportunities, track your portfolio, and build your CV.",
    href: "/login/student",
    signupHref: "/signup/student",
    accent: "indigo",
  },
  {
    accountType: "school" as const,
    title: "School",
    description:
      "Monitor linked students' progress and publish opportunities for them.",
    href: "/login/school",
    signupHref: "/signup/school",
    accent: "emerald",
  },
  {
    accountType: "organization" as const,
    title: "Organization",
    description:
      "Share workshops, programs, and competitions with students on OpportunityHub.",
    href: "/login/organization",
    signupHref: "/signup/organization",
    accent: "violet",
  },
] as const;

export const APP_TAGLINE =
  "Discover opportunities, track activities, and build your university portfolio.";

export const EDUCATION_LEVELS = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "IGCSE",
  "AS Level",
  "A Level",
] as const;

export const ACTIVITY_CATEGORIES = [
  "Academic",
  "Leadership",
  "Service",
  "Projects",
  "Work Experience",
  "Creative",
] as const;

export const STUDENT_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/cv-builder", label: "CV Builder" },
  { href: "/ai-suggestions", label: "AI Advisor" },
  { href: "/profile", label: "Profile" },
] as const;

export const SCHOOL_NAV_LINKS = [
  { href: "/school/dashboard", label: "Dashboard" },
  { href: "/school/students", label: "Students" },
  { href: "/opportunities/new", label: "Add opportunity" },
  { href: "/opportunities", label: "Browse" },
  { href: "/school/profile", label: "Settings" },
] as const;

export const ORG_NAV_LINKS = [
  { href: "/org/dashboard", label: "Dashboard" },
  { href: "/opportunities/new", label: "Add opportunity" },
  { href: "/opportunities", label: "Browse" },
  { href: "/org/profile", label: "Settings" },
] as const;

export const OPPORTUNITY_TYPES = [
  "Competition",
  "Workshop",
  "Internship",
  "Volunteering",
  "Summer Program",
  "Scholarship",
  "Club",
  "Other",
] as const;

export const SUBJECT_AREAS = [
  "Science",
  "Mathematics",
  "Technology",
  "English",
  "Social Studies",
  "Business",
  "Medicine",
  "Environment",
  "Arts",
] as const;

export const DEADLINE_FILTERS = [
  { value: "", label: "Any deadline" },
  { value: "week", label: "Due this week" },
  { value: "month", label: "Due this month" },
  { value: "later", label: "Due later" },
] as const;

export const FORMAT_FILTERS = [
  { value: "", label: "Any format" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "In person" },
] as const;
