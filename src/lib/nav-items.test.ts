import { describe, expect, it } from "vitest";

import { GUEST_NAV_ITEMS, isNavSuppressedPath, resolveActiveHref, SIGNED_IN_NAV_ITEMS } from "@/lib/nav-items";

describe("resolveActiveHref", () => {
  it.each([
    ["/recipes", "/recipes"],
    ["/recipes/", "/recipes"],
    ["/recipes/new", "/recipes/new"],
    ["/recipes/abc-123", "/recipes"],
    ["/recipes/abc-123/edit", "/recipes"],
  ])("highlights %s as %s", (pathname, expected) => {
    expect(resolveActiveHref(pathname, SIGNED_IN_NAV_ITEMS)).toBe(expected);
  });

  it.each(["/recipesfoo", "/", "/dashboard"])("returns null for %s", (pathname) => {
    expect(resolveActiveHref(pathname, SIGNED_IN_NAV_ITEMS)).toBeNull();
  });
});

describe("isNavSuppressedPath", () => {
  it.each(["/auth/signin", "/auth/signup", "/auth/confirm-email"])("suppresses %s", (pathname) => {
    expect(isNavSuppressedPath(pathname)).toBe(true);
  });

  it.each(["/", "/dashboard", "/recipes"])("does not suppress %s", (pathname) => {
    expect(isNavSuppressedPath(pathname)).toBe(false);
  });
});

describe("nav item labels and hrefs", () => {
  it("defines signed-in items per S-08", () => {
    expect(SIGNED_IN_NAV_ITEMS).toEqual([
      { href: "/recipes", label: "Twoje przepisy" },
      { href: "/recipes/new", label: "Nowy przepis" },
    ]);
  });

  it("defines guest items per S-08", () => {
    expect(GUEST_NAV_ITEMS).toEqual([
      { href: "/auth/signin", label: "Zaloguj" },
      { href: "/auth/signup", label: "Zarejestruj" },
    ]);
  });
});
