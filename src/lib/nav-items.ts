export interface NavItem {
  href: string;
  label: string;
}

export const NAV_BRAND_HREF = "/";

export const SIGNED_IN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/recipes", label: "Twoje przepisy" },
  { href: "/recipes/new", label: "Nowy przepis" },
];

export const GUEST_NAV_ITEMS: readonly NavItem[] = [
  { href: "/auth/signin", label: "Zaloguj" },
  { href: "/auth/signup", label: "Zarejestruj" },
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isNavSuppressedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === "/auth" || normalized.startsWith("/auth/");
}

export function resolveActiveHref(pathname: string, items: readonly NavItem[]): string | null {
  const normalized = normalizePathname(pathname);
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);

  for (const item of sorted) {
    const href = normalizePathname(item.href);

    if (normalized === href) {
      return item.href;
    }

    if (normalized.startsWith(`${href}/`)) {
      return item.href;
    }
  }

  return null;
}
