import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, getNormalizedSupabaseUrl, getSupabaseAnonKey } from "@/lib/env";
import {
  dashboardPathFor,
  isOrgAppRoute,
  isPublicPublisherProfileRoute,
  isSchoolAppRoute,
  isStudentAppRoute,
  canManageOpportunities,
  studentNeedsOnboardingGate,
} from "@/lib/auth/account";
import type { AccountType } from "@/lib/types";

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  // Password recovery must be reachable while signed out.
  if (pathname === "/forgot-password") return true;
  if (pathname === "/reset-password") return true;
  // Opportunities browsing and viewing are public before signing in
  if (pathname === "/opportunities") return true;
  if (
    pathname.startsWith("/opportunities/") &&
    !pathname.startsWith("/opportunities/new") &&
    !pathname.endsWith("/edit")
  ) {
    return true;
  }
  if (isPublicPublisherProfileRoute(pathname)) return true;
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}

function routeForSignedOutVisitor(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname) || isAuthRoute(pathname)) {
    return NextResponse.next({ request });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  // With no usable Supabase configuration there is no session to read, but the
  // route rules below must still run: treating the visitor as signed out keeps
  // protected pages redirecting to /login instead of rendering.
  if (!hasSupabaseEnv()) {
    return routeForSignedOutVisitor(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getNormalizedSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let accountType: AccountType = "student";
  let onboardingCompleted = true;

  if (user) {
    const metaType = user.user_metadata?.account_type as AccountType | undefined;
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (
      metaType &&
      (metaType === "student" ||
        metaType === "school" ||
        metaType === "organization")
    ) {
      accountType = metaType;
    } else {
      accountType = (profile?.account_type as AccountType | undefined) ?? "student";
    }

    if (accountType === "student") {
      onboardingCompleted = profile?.onboarding_completed ?? true;
    }
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPathFor(accountType);
    return NextResponse.redirect(url);
  }

  if (user) {
    if (accountType === "student" && (isSchoolAppRoute(pathname) || isOrgAppRoute(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (accountType === "school" && (isStudentAppRoute(pathname) || isOrgAppRoute(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = "/school/dashboard";
      return NextResponse.redirect(url);
    }

    if (accountType === "organization" && (isStudentAppRoute(pathname) || isSchoolAppRoute(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = "/org/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname === "/opportunities/new" && !canManageOpportunities(accountType)) {
      const url = request.nextUrl.clone();
      url.pathname = dashboardPathFor(accountType);
      return NextResponse.redirect(url);
    }

    if (
      accountType === "student" &&
      !onboardingCompleted &&
      studentNeedsOnboardingGate(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
