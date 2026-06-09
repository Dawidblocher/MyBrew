import { describe, expect, it } from "vitest";

import { buildRecipeJsonBlob, sanitizeFilename } from "@/lib/recipe-export";
import { defaultRecipeDraft } from "@/lib/recipe-schema";
import type { RecipeRecord } from "@/types";

const sampleRecord: RecipeRecord = {
  id: "recipe-1",
  userId: "user-123",
  name: "Testowe Piwo / IPA",
  style: "American IPA",
  blg: 12.5,
  srm: 8.2,
  ibu: 45,
  abv: 5.6,
  createdAt: "2026-06-09T10:00:00.000Z",
  data: defaultRecipeDraft,
};

describe("sanitizeFilename", () => {
  it("preserves Polish characters", () => {
    expect(sanitizeFilename("Żółć z gęślą")).toBe("Żółć z gęślą");
  });

  it("removes filesystem-illegal characters", () => {
    expect(sanitizeFilename('Piwo: "IPA" / test')).toBe("Piwo IPA  test");
  });

  it("trims leading and trailing dots and spaces", () => {
    expect(sanitizeFilename("  .mój przepis.  ")).toBe("mój przepis");
  });

  it("falls back to przepis when empty or whitespace", () => {
    expect(sanitizeFilename("")).toBe("przepis");
    expect(sanitizeFilename("   ")).toBe("przepis");
    expect(sanitizeFilename("///")).toBe("przepis");
  });
});

describe("buildRecipeJsonBlob", () => {
  it("returns application/json blob that round-trips to the input record", async () => {
    const blob = buildRecipeJsonBlob(sampleRecord);

    expect(blob.type).toBe("application/json");

    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(sampleRecord);
  });
});
