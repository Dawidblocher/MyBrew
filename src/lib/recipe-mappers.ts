import type { RecipeDraft, RecipeListItem, RecipeRecord } from "@/types";

export interface RecipeListRow {
  id: string;
  name: string;
  style: string;
  blg: number;
  srm: number;
  ibu: number;
  abv: number;
  created_at: string;
}

export interface RecipeRecordRow extends RecipeListRow {
  user_id: string;
  data: RecipeDraft;
}

export function mapRowToListItem(row: RecipeListRow): RecipeListItem {
  return {
    id: row.id,
    name: row.name,
    style: row.style,
    blg: row.blg,
    srm: row.srm,
    ibu: row.ibu,
    abv: row.abv,
    createdAt: row.created_at,
  };
}

export function mapRowToRecord(row: RecipeRecordRow): RecipeRecord {
  return {
    ...mapRowToListItem(row),
    userId: row.user_id,
    data: row.data,
  };
}
