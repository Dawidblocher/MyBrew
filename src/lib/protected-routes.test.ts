import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/lib/protected-routes";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/recipes", "/recipes/new", "/recipes/abc-123", "/recipes/abc-123/edit", "/recipesfoo"])(
    "protects %s",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(true);
    },
  );

  it.each(["/", "/auth/signin", "/api/recipes", "/api/recipes/abc-123"])("does not protect %s", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(false);
  });
});
