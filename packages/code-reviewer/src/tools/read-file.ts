import { tool } from "ai";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_CHARS = 20_000;

/**
 * ToolLoopAgent.generate()/.stream() in the installed ai@7.0.93 don't accept
 * a per-call toolsContext (only the standalone generateText()/streamText() do),
 * so repoRoot is bound once here via closure instead of a tool contextSchema.
 */
export function createReadFileTool(repoRoot: string) {
  return tool({
    description: "Read a file from the repository being reviewed, to see context around the diff.",
    inputSchema: z.object({
      path: z.string().describe("Repo-relative path of the file to read"),
    }),
    execute: async ({ path: relativePath }) => {
      const resolved = path.resolve(repoRoot, relativePath);
      const rootWithSep = path.join(repoRoot, path.sep);
      if (resolved !== repoRoot && !resolved.startsWith(rootWithSep)) {
        throw new Error(`Refusing to read outside repo root: ${relativePath}`);
      }

      const content = await readFile(resolved, "utf-8");
      if (content.length > MAX_FILE_CHARS) {
        return `${content.slice(0, MAX_FILE_CHARS)}\n... (truncated)`;
      }
      return content;
    },
  });
}
