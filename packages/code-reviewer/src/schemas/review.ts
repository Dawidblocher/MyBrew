import { z } from "zod";

export const findingSchema = z.object({
  file: z.string().describe("Repo-relative path of the file the finding is in"),
  line: z.number().int().optional().describe("1-indexed line the finding anchors to, if applicable"),
  severity: z.enum(["blocker", "major", "minor", "nit"]).describe("How severe the finding is"),
  category: z
    .string()
    .describe("Short kebab-case slug of the finding type, e.g. correctness, security, style"),
  summary: z.string().describe("One-sentence statement of the issue"),
});

export const reviewOutputSchema = z.object({
  summary: z.string().describe("One-sentence summary of the review"),
  verdict: z.enum(["approve", "request_changes", "comment"]),
  findings: z.array(findingSchema).describe("Specific issues found in the diff, most severe first"),
});

export type Finding = z.infer<typeof findingSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
