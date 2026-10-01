import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, ToolLoopAgent, isStepCount } from "ai";
import { reviewInstructions } from "../prompts/review.js";
import { reviewOutputSchema } from "../schemas/review.js";
import type { Finding, ReviewOutput } from "../schemas/review.js";
import { createReviewTools } from "../tools/index.js";

export { reviewOutputSchema };
export type { Finding, ReviewOutput };

export interface CodeReviewAgentConfig {
  /** Absolute path to the repository being reviewed; sandboxes the readFile tool. */
  repoRoot: string;
  apiKey?: string;
  model?: string;
}

export function createCodeReviewAgent(config: CodeReviewAgentConfig) {
  const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(config.model ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5");

  return new ToolLoopAgent({
    model,
    instructions: reviewInstructions,
    tools: createReviewTools(config.repoRoot),
    output: Output.object({ schema: reviewOutputSchema }),
    stopWhen: isStepCount(8),
    maxOutputTokens: 4096,
  });
}
