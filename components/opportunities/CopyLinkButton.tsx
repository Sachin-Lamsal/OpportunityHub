"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copies the current page link to the clipboard.
 *
 * Uses the async Clipboard API where it is available (and in a secure
 * context) and falls back to a hidden textarea + `document.execCommand`,
 * because `navigator.clipboard` is unavailable on plain HTTP and in some
 * older browsers.
 *
 * The shared link is the clean page address: the browse filters a student
 * happens to have applied are not part of the opportunity's identity.
 */
export default function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    const url = `${window.location.origin}${window.location.pathname}`;
    let outcome: "copied" | "failed" = "copied";

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("copy command failed");
      }
    } catch {
      outcome = "failed";
    }

    setStatus(outcome);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setStatus("idle"),
      outcome === "copied" ? 2000 : 3000,
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
        {label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied"
          ? "Link copied to clipboard"
          : status === "failed"
            ? "Could not copy the link"
            : ""}
      </span>
      {status !== "idle" && (
        <span
          aria-hidden="true"
          className={
            status === "copied"
              ? "text-sm font-medium text-emerald-700"
              : "text-sm font-medium text-rose-700"
          }
        >
          {status === "copied" ? "Link copied" : "Copy failed"}
        </span>
      )}
    </span>
  );
}
