"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { APP_NAME } from "@/lib/constants";

interface HeaderProps {
  variant?: "public" | "app";
}

export default function Header({ variant = "public" }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            OH
          </span>
          <span className="text-lg font-semibold text-slate-900 font-display">{APP_NAME}</span>
        </Link>

        {variant === "public" ? (
          <>
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/opportunities" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Browse Opportunities
              </Link>
              <Link href="/#features" className="text-sm text-slate-600 hover:text-slate-900">
                Features
              </Link>
              <Link href="/#how-it-works" className="text-sm text-slate-600 hover:text-slate-900">
                How it works
              </Link>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Button href="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button href="/signup" size="sm">
                Sign up free
              </Button>
            </div>

            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="public-nav-mobile-menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </>
        ) : null}
      </div>

      {variant === "public" && menuOpen && (
        <div
          id="public-nav-mobile-menu"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-3">
            <Link
              href="/opportunities"
              className="text-sm font-medium text-indigo-600"
              onClick={() => setMenuOpen(false)}
            >
              Browse Opportunities
            </Link>
            <Link href="/#features" className="text-sm text-slate-600" onClick={() => setMenuOpen(false)}>
              Features
            </Link>
            <Link href="/#how-it-works" className="text-sm text-slate-600" onClick={() => setMenuOpen(false)}>
              How it works
            </Link>
            <Button href="/login" variant="outline" size="sm" className="w-full">
              Log in
            </Button>
            <Button href="/signup" size="sm" className="w-full">
              Sign up free
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
