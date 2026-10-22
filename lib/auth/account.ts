import type { AccountType } from "@/lib/types";

export const DASHBOARD_BY_ACCOUNT_TYPE: Record<AccountType, string> = {
  student: "/dashboard",
  school: "/school/dashboard",
  organization: "/org/dashboard",
};

export function dashboardPathFor(
  accountType: AccountType | null | undefined,
): string {
  if (accountType && accountType in DASHBOARD_BY_ACCOUNT_TYPE) {
    return DASHBOARD_BY_ACCOUNT_TYPE[accountType];
  }
  return DASHBOARD_BY_ACCOUNT_TYPE.student;
}

export function loginPathFor(accountType: AccountType): string {
  return `/login/${accountType}`;
}

export function signupPathFor(accountType: AccountType): string {
  return `/signup/${accountType}`;
}

const STUDENT_ROUTE_PREFIXES = [
  "/dashboard",
  "/portfolio",
  "/cv-builder",
  "/profile",
  "/ai-suggestions",
  "/onboarding",
  "/saved",
] as const;

const SCHOOL_ROUTE_PREFIX = "/school";
const ORG_ROUTE_PREFIX = "/org";

export function isStudentAppRoute(pathname: string): boolean {
  return STUDENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isSchoolAppRoute(pathname: string): boolean {
  if (isPublicPublisherProfileRoute(pathname)) return false;
  return (
    pathname === SCHOOL_ROUTE_PREFIX ||
    pathname.startsWith(`${SCHOOL_ROUTE_PREFIX}/`)
  );
}

export function isOrgAppRoute(pathname: string): boolean {
  if (isPublicPublisherProfileRoute(pathname)) return false;
  return (
    pathname === ORG_ROUTE_PREFIX ||
    pathname.startsWith(`${ORG_ROUTE_PREFIX}/`)
  );
}

export function canManageOpportunities(
  accountType: AccountType | null | undefined,
): boolean {
  return accountType === "school" || accountType === "organization";
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public publisher profile at /org/{uuid} or /school/{uuid} (not dashboard/settings routes). */
export function isPublicPublisherProfileRoute(pathname: string): boolean {
  const orgMatch = pathname.match(/^\/org\/([^/]+)$/);
  if (orgMatch && UUID_RE.test(orgMatch[1])) return true;

  const schoolMatch = pathname.match(/^\/school\/([^/]+)$/);
  if (schoolMatch && UUID_RE.test(schoolMatch[1])) return true;

  return false;
}

export function studentNeedsOnboardingGate(pathname: string): boolean {
  if (pathname === "/onboarding") return false;
  if (pathname.startsWith("/opportunities")) return false;
  if (isPublicPublisherProfileRoute(pathname)) return false;
  return isStudentAppRoute(pathname);
}
