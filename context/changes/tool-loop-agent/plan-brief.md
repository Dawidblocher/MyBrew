# Code Review Agent (ToolLoopAgent) — Plan Brief

> Full plan: `context/changes/tool-loop-agent/plan.md`

## What & Why

Convert `packages/code-reviewer/src/index.ts` from a one-shot demo script into a modular, reusable code-review agent built on the AI SDK's `ToolLoopAgent`. The agent reviews a unified diff, can call a sandboxed `readFile` tool for extra context, and returns a typed findings-based structured output — shaped so it can be dropped into a promptfoo eval later without further refactoring.

## Starting Point

`src/index.ts` (34 lines) creates an OpenRouter model at import time (throwing if the API key is missing), defines an inline `reviewSummarySchema` (`summary`/`verdict`/`highlights: string[]`), and calls `generateText` once against a hardcoded hypothetical prompt — no tools, no real diff input, no reusable export.

## Desired End State

`npm run dev -- <path-to-diff-file>` reads a real diff, runs it through `createCodeReviewAgent()` (which can call `readFile` to pull extra context from the repo), and prints a structured JSON review (`summary`, `verdict`, `findings[]`) to stdout. `createCodeReviewAgent` is a standalone, side-effect-free factory importable from `src/agent/index.ts`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Input mode | Diff text in, `readFile` tool for context | Justifies `ToolLoopAgent` (there's something to loop on) while staying easy to feed fixed diffs in future eval cases | Plan |
| Output schema | Findings list (`file`/`line`/`severity`/`category`/`summary`) + `summary`/`verdict` | Lets a future eval grader assert against individual findings instead of an unstructured string list | Plan |
| Export shape | Factory function `createCodeReviewAgent(config?)` | No import-time throw, no shared mutable state; each eval case can construct its own agent | Plan |
| Config | Env vars as defaults, overridable via factory config | CLI keeps working unchanged; future evals can swap models without mutating `process.env` | Plan |
| Tool sandbox root | `repoRoot` passed per-call via `toolsContext`, not baked into the agent | One agent instance can review multiple repos/checkouts across eval cases | Plan |
| Loop bound | `stopWhen: isStepCount(8)` | A diff review needs a handful of file reads, not the SDK's default 20 steps — keeps cost/latency predictable | Plan |
| CLI entry | Reads diff file path from argv, prints JSON | Gives a real manual-testing path against actual diffs instead of a hardcoded prompt | Plan |
| Verification | Typecheck + manual CLI run only, no test framework added | Matches "don't configure eval environment" — promptfoo will be the real regression net later | Plan |

## Scope

**In scope:** schema/prompt extraction into modules, a sandboxed `readFile` tool, the `createCodeReviewAgent` factory, CLI rewire to accept a real diff file.

**Out of scope:** promptfoo or any eval harness configuration, a `gitDiff`-running or `listDirectory` tool, a test framework (vitest/jest) or automated tests, `package.json` `exports`/publishing changes, streaming support, retry/telemetry beyond SDK defaults.

## Architecture / Approach

Five small modules under `src/`: `schemas/review.ts` (zod schema), `prompts/review.ts` (instructions + prompt builder), `tools/read-file.ts` + `tools/index.ts` (sandboxed tool), `agent/index.ts` (the reusable `createCodeReviewAgent` factory that assembles all of the above into a configured `ToolLoopAgent`). `src/index.ts` becomes a thin CLI that reads a diff file from argv and calls the factory.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schemas & Prompts Modules | New findings-based schema + extracted instructions/prompt builder, no wiring yet | Schema redesign could under- or over-specify what the model can reliably populate |
| 2. Tools & Agent Factory | Sandboxed `readFile` tool + `createCodeReviewAgent` factory | Path-traversal sandboxing logic is security-sensitive and easy to get subtly wrong |
| 3. CLI Rewire & Verification | Argv-driven CLI, build/typecheck clean, manual end-to-end run | `NodeNext` relative-import `.js` extension gotcha across the new modules |

**Prerequisites:** none — `ai@7.0.93`, `@openrouter/ai-sdk-provider`, and `zod` are already installed; `OPENROUTER_API_KEY` is already set in `.env`.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- Assumes a diff-plus-`readFile` review style produces good-enough findings without a `gitDiff`-running tool or `listDirectory`; if eval results later show the agent needs broader repo exploration, that's a follow-up change, not a redo of this one.
- No automated regression protection until promptfoo evals exist — a prompt or schema tweak could silently change behavior between now and then.

## Success Criteria (Summary)

- `npm run typecheck` and `npm run build` are clean after all three phases.
- `npm run dev -- <diff-file>` against a real diff prints JSON matching `reviewOutputSchema`, with the model demonstrably using the `readFile` tool for context at least once.
- A path-traversal attempt through `readFile` is rejected rather than silently succeeding.
