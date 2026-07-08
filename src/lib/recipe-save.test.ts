import { describe, expect, it } from "vitest";

import { draftWithHops } from "@/lib/__tests__/fixtures";
import { buildRecipeInsert } from "@/lib/recipe-save";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import { defaultRecipeDraft } from "@/lib/recipe-schema";

describe("buildRecipeInsert", () => {
  it("valid draft → insert with server-recomputed metrics", () => {
    const input = draftWithHops();
    const expected = computeWizardMetrics(input);

    const result = buildRecipeInsert(input, "user-123");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insert.user_id).toBe("user-123");
    expect(result.insert.name).toBe("Test IPA");
    expect(result.insert.style).toBe("American IPA");
    expect(result.insert.data).toEqual(input);

    if (expected.blg.ok && expected.srm.ok && expected.ibu.ok && expected.abv.ok) {
      expect(result.insert.blg).toBe(expected.blg.value);
      expect(result.insert.srm).toBe(expected.srm.value);
      expect(result.insert.ibu).toBe(expected.ibu.value);
      expect(result.insert.abv).toBe(expected.abv.value);
    }
  });

  it("blank style → validation error", () => {
    const result = buildRecipeInsert(draftWithHops({ basics: { name: "Test", style: "   " } }), "user-123");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const styleError = result.errors.find((e) => e.field === "basics.style");
    expect(styleError?.message).toContain("Styl");
  });

  it("blank name → validation error with field basics.name", () => {
    const result = buildRecipeInsert(draftWithHops({ basics: { name: "   ", style: "American IPA" } }), "user-123");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const nameError = result.errors.find((e) => e.field === "basics.name");
    expect(nameError?.message).toContain("Nazwa");
  });

  it("no qualifying hops → metrics.ibu validation error", () => {
    const result = buildRecipeInsert(draftWithHops({ hops: [] }), "user-123");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const ibuError = result.errors.find((e) => e.field === "metrics.ibu");
    expect(ibuError).toBeDefined();
  });

  it("empty yeast.strain → save ok (product-incomplete but Zod-valid)", () => {
    const result = buildRecipeInsert(draftWithHops({ yeast: { ...defaultRecipeDraft.yeast, strain: "" } }), "user-123");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insert.data.yeast.strain).toBe("");
  });

  it("no positive malt → validation error", () => {
    const result = buildRecipeInsert(
      draftWithHops({ malts: [{ name: "Empty", amountKg: 0, colorEbc: 4, extractPercent: 80 }] }),
      "user-123",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const maltError = result.errors.find((e) => e.field === "malts");
    expect(maltError?.message).toContain("Zasyp");
  });

  it("cleared attenuation → ABV metric error", () => {
    const result = buildRecipeInsert(
      draftWithHops({ yeast: { ...defaultRecipeDraft.yeast, attenuationPct: 0 } }),
      "user-123",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const abvError = result.errors.find((e) => e.field === "metrics.abv");
    expect(abvError?.message).toContain("Odfermentowanie");
  });
});
