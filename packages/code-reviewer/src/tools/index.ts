import { createReadFileTool } from "./read-file.js";

export function createReviewTools(repoRoot: string) {
  return {
    readFile: createReadFileTool(repoRoot),
  };
}
