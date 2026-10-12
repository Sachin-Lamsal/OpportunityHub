"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  APP_NAME,
  ORG_NAV_LINKS,
  SCHOOL_NAV_LINKS,
  STUDENT_NAV_LINKS,
} from "@/lib/constants";
import type { AccountType } from "@/lib/types";
import { dashboardPathFor } from "@/lib/auth/account";

interface AppNavProps {
  accountType?: AccountType | null;
  isLoggedIn?: boolean;
}

const PUBLIC_NAV_LINKS = [
  { href: "/opportunities", label: "Opportunities" },
] as const;

function navLinksFor(accountType?: AccountType | null, isLoggedIn = false) {
  if (!isLoggedIn || !accountType) return PUBLIC_NAV_LINKS;
  if (accountType === "school") return SCHOOL_NAV_LINKS;
  if (accountType === "organization") return ORG_NAV_LINKS;
  return STUDENT_NAV_LINKS;
}

export default function AppNav({ accountType = "student", isLoggedIn = true }: AppNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navLinksFor(accountType, isLoggedIn);
  const homeHref = isLoggedIn && accountType ? dashboardPathFor(accountType) : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={homeHref} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            OH
          </span>
          <span className="hidden text-lg font-semibold text-slate-900 sm:inline">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== homeHref && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isLoggedIn ? (
            <LogoutButton accountType={accountType ?? "student"} />
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-2xs transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== homeHref && pathname.startsWith(link.href));

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="border-t border-slate-100 pt-3 mt-2">
              {isLoggedIn ? (
                <LogoutButton accountType={accountType ?? "student"} />
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
