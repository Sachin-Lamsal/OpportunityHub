/**
 * Active-navigation helpers.
 *
 * Pure so the highlight rule can be unit tested: a page such as
 * `/opportunities/new` matches both `/opportunities/new` and `/opportunities`,
 * and the previously used `pathname.startsWith(href)` rule highlighted both
 * items at once for publisher accounts.
 */

export interface NavLink {
  href: string;
  label?: string;
}

/**
 * Returns the href of the nav item that should be highlighted, or null.
 *
 * The longest matching href wins, so a nested route highlights the most
 * specific entry. Exact matches always win.
 */
export function activeNavHref(
  pathname: string,
  links: readonly NavLink[],
  homeHref: string,
): string | null {
  let best: string | null = null;

  for (const link of links) {
    const isMatch =
      pathname === link.href ||
      (link.href !== homeHref &&
        pathname.startsWith(link.href.endsWith("/") ? link.href : `${link.href}/`));

    if (!isMatch) continue;

    if (best === null || link.href.length > best.length) {
      best = link.href;
    }
  }

  return best;
}
