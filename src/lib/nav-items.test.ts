import { describe, expect, it } from "vitest";

import { GUEST_NAV_ITEMS, resolveActiveHref, SIGNED_IN_NAV_ITEMS } from "@/lib/nav-items";

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

describe("nav item labels and hrefs", () => {
  it("defines signed-in items per S-08", () => {
    expect(SIGNED_IN_NAV_ITEMS).toEqual([
      { href: "/recipes", label: "Twoje przepisy", icon: "recipes" },
      { href: "/recipes/new", label: "Nowy przepis", icon: "new-recipe" },
    ]);
  });

  it("defines guest items per S-08", () => {
    expect(GUEST_NAV_ITEMS).toEqual([
      { href: "/auth/signin", label: "Zaloguj", icon: "signin" },
      { href: "/auth/signup", label: "Zarejestruj", icon: "signup" },
    ]);
  });
});
