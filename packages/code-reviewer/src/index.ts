import { readFile } from "node:fs/promises";
import { createCodeReviewAgent } from "./agent/index.js";
import { buildReviewPrompt } from "./prompts/review.js";

async function main() {
  const diffPath = process.argv[2];
  if (!diffPath) {
    console.error("Usage: tsx src/index.ts <path-to-diff-file>");
    process.exitCode = 1;
    return;
  }

  const diff = await readFile(diffPath, "utf-8");
  const repoRoot = process.cwd();
  const agent = createCodeReviewAgent({ repoRoot });

  const { output } = await agent.generate({
    prompt: buildReviewPrompt(diff),
  });

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
