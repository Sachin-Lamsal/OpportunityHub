"use client";

import { useEffect } from "react";

/**
 * Warns before the user leaves a page with unsaved changes.
 *
 * Two cases are covered:
 *
 * 1. Browser-level navigation (reload, close, typing a new URL) is handled by
 *    the `beforeunload` event.
 * 2. In-app navigation through a link is handled by a capture-phase click
 *    listener on `document`. The capture phase runs before React's own
 *    listener on the app root, so cancelling the event stops the link from
 *    navigating — this works for every link on the page without having to
 *    replace `Link` with a custom component.
 *
 * Modifier-clicks (open in a new tab) and links that opt out through
 * `data-allow-unsaved-changes` are never blocked.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  message = "You have unsaved changes. Leave this page and lose them?",
) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.allowUnsavedChanges === "true") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty, message]);
}
