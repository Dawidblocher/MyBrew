import { describe, expect, it } from "vitest";

import { mapRowToListItem, mapRowToRecord, type RecipeListRow, type RecipeRecordRow } from "@/lib/recipe-mappers";
import { defaultRecipeDraft } from "@/lib/recipe-schema";

const listRow: RecipeListRow = {
  id: "recipe-1",
  name: "Test IPA",
  style: "American IPA",
  blg: 12.5,
  srm: 8.2,
  ibu: 45,
  abv: 5.6,
  created_at: "2026-06-09T10:00:00.000Z",
};

const recordRow: RecipeRecordRow = {
  ...listRow,
  user_id: "user-123",
  updated_at: "2026-06-14T08:00:00.000Z",
  data: defaultRecipeDraft,
};

describe("mapRowToListItem", () => {
  it("maps snake_case created_at to camelCase createdAt", () => {
    const item = mapRowToListItem(listRow);

    expect(item.createdAt).toBe("2026-06-09T10:00:00.000Z");
    expect(item).not.toHaveProperty("created_at");
  });

  it("passes through id, name, style, and metrics", () => {
    const item = mapRowToListItem(listRow);

    expect(item).toEqual({
      id: "recipe-1",
      name: "Test IPA",
      style: "American IPA",
      blg: 12.5,
      srm: 8.2,
      ibu: 45,
      abv: 5.6,
      createdAt: "2026-06-09T10:00:00.000Z",
    });
  });
});

describe("mapRowToRecord", () => {
  it("maps user_id to userId and includes data", () => {
    const record = mapRowToRecord(recordRow);

    expect(record.userId).toBe("user-123");
    expect(record.data).toEqual(defaultRecipeDraft);
    expect(record).not.toHaveProperty("user_id");
  });

  it("maps updated_at to updatedAt", () => {
    const record = mapRowToRecord(recordRow);

    expect(record.updatedAt).toBe("2026-06-14T08:00:00.000Z");
    expect(record).not.toHaveProperty("updated_at");
  });

  it("includes list item fields from the row", () => {
    const record = mapRowToRecord(recordRow);

    expect(record.id).toBe("recipe-1");
    expect(record.name).toBe("Test IPA");
    expect(record.style).toBe("American IPA");
    expect(record.blg).toBe(12.5);
    expect(record.srm).toBe(8.2);
    expect(record.ibu).toBe(45);
    expect(record.abv).toBe(5.6);
    expect(record.createdAt).toBe("2026-06-09T10:00:00.000Z");
  });
});
