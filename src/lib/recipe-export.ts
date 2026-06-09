import type { RecipeRecord } from "@/types";

const ILLEGAL_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFilename(name: string): string {
  const sanitized = name.replace(ILLEGAL_FILENAME_CHARS, "").replace(/^[\s.]+|[\s.]+$/g, "");
  return sanitized || "przepis";
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildRecipeJsonBlob(record: RecipeRecord): Blob {
  return new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
}
