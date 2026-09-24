export type NavIconKey = "recipes" | "new-recipe" | "signin" | "signup";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
}

export const NAV_BRAND_HREF = "/";

export const SIGNED_IN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/recipes", label: "Twoje przepisy", icon: "recipes" },
  { href: "/recipes/new", label: "Nowy przepis", icon: "new-recipe" },
];

export const GUEST_NAV_ITEMS: readonly NavItem[] = [
  { href: "/auth/signin", label: "Zaloguj", icon: "signin" },
  { href: "/auth/signup", label: "Zarejestruj", icon: "signup" },
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
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
