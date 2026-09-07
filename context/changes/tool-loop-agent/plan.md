# Code Review Agent (ToolLoopAgent) Implementation Plan

## Overview

Convert `packages/code-reviewer/src/index.ts` — currently a single-file demo that runs one `generateText` call with a hardcoded prompt — into a modular, reusable code-review agent built on the AI SDK's `ToolLoopAgent`. The agent reviews a unified diff, can pull extra file context via a sandboxed `readFile` tool, and returns a typed findings-based structured output. The reusable agent module is exported so it can later be wired into promptfoo evals without further refactoring (wiring the eval harness itself is explicitly out of scope for this change).

## Current State Analysis

`packages/code-reviewer/src/index.ts` (34 lines, the package's only source file):
- Creates an OpenRouter provider and model at module scope, throwing at import time if `OPENROUTER_API_KEY` is missing.
- Defines `reviewSummarySchema` (`summary`, `verdict`, `highlights: string[]`) inline.
- Calls `generateText({ model, output: Output.object({ schema }), prompt: <hardcoded hypothetical prompt> })` — no tools, no real diff input.
- `package.json` scripts (`dev`, `build`, `start`, `typecheck`) all point at `src/index.ts` / `dist/index.js`; no test runner is configured.
- The package is untracked in git with no prior commits — there are no existing conventions or history to preserve.

## Desired End State

Running `npm run dev -- <path-to-diff-file>` from `packages/code-reviewer/` reads the given diff file, builds a `ToolLoopAgent`-based code review agent via `createCodeReviewAgent()`, lets the model call a sandboxed `readFile` tool (rooted at `process.cwd()`) for extra context, and prints a structured JSON review (`summary`, `verdict`, `findings[]`) to stdout. `createCodeReviewAgent` is importable from `src/agent/index.ts` as a standalone module with no other package-level side effects, ready to be imported by a future promptfoo custom provider.

Verify via: `npm run typecheck` (clean), `npm run build` (clean), and a manual `npm run dev -- <diff-file>` run producing valid JSON matching the schema.

### Key Discoveries:

- `ai@7.0.93` (installed, matches bundled docs) exports `ToolLoopAgent`, `tool`, `Output`, and `isStepCount` — confirmed via `node -e "require('ai')"` and `node_modules/ai/docs/07-reference/01-ai-sdk-core/16-tool-loop-agent.mdx`.
- Tool `contextSchema` + call-time `toolsContext` (docs: `node_modules/ai/docs/03-agents/02-building-agents.mdx:80-130`) is the documented way to pass per-call values like a sandboxed repo root into a tool without baking it into the agent instance.
- Errors thrown inside a tool's `execute()` are caught by the loop and surfaced as a `tool-error` step (confirmed in `node_modules/ai/dist/index.d.ts:3283`, `"When toolOutput.type === 'tool-error': toolOutput.error contains the error"`) rather than crashing the process — the sandboxing check in the `readFile` tool can simply `throw`.
- `tsconfig.json` uses `"module": "NodeNext"` / `"moduleResolution": "NodeNext"` — relative imports between the new modules must include the `.js` extension (matching compiled output) even though the source files are `.ts`.

## What We're NOT Doing

- Not configuring promptfoo or any eval harness/config — only shaping the module so it's easy to plug in later.
- Not adding a `gitDiff`-running tool or `listDirectory` tool — the agent receives the diff as text and only reads individual files for context.
- Not adding a test framework (vitest/jest) or automated tests for this change — verification is typecheck + manual CLI run, per the explicit scope decision for this change.
- Not changing `package.json`'s `exports`/`main` field or publishing setup — the module stays reachable via relative source imports for now.
- Not adding retry/backoff, telemetry, or lifecycle-callback logging beyond the SDK's defaults.
- Not supporting `stream()` — only `generate()` is wired up.

## Implementation Approach

Extract the current single file into five small modules under `src/`: `schemas/review.ts` (structured output schema), `prompts/review.ts` (instructions + prompt builder), `tools/read-file.ts` + `tools/index.ts` (sandboxed tool set), and `agent/index.ts` (the reusable `createCodeReviewAgent` factory that assembles the above into a `ToolLoopAgent`). `src/index.ts` becomes a thin CLI entry point that reads a diff file path from argv and calls the factory. Build bottom-up: schemas/prompts first (no behavior change risk), then the tool + factory, then rewire the CLI last so there's always a working `typecheck` at each phase boundary.

## Critical Implementation Details

- **Module resolution (NodeNext)**: every relative import added between the new files (e.g. `agent/index.ts` importing from `../schemas/review.js`) must use the `.js` extension, not `.ts` — `tsconfig.json`'s `NodeNext` resolution requires it, and omitting it is a common source of a confusing runtime `ERR_MODULE_NOT_FOUND` that TypeScript itself won't catch at the source level in all cases.
- **Tool error handling**: don't wrap the `readFile` tool's sandbox check or `fs.readFile` call in a try/catch that swallows or reformats the error — the SDK already converts a thrown error into a `tool-error` step the model can see and react to (e.g. try a different path). Just `throw` on a sandbox violation or file-not-found; no custom error envelope needed.

## Phase 1: Schemas & Prompts Modules

### Overview

Extract the structured-output schema and the prompt content into their own modules, upgrading the schema from a flat `highlights: string[]` to a typed `findings` array. No agent wiring yet — this phase is a pure extraction plus schema redesign, so it can be typechecked in isolation.

### Changes Required:

#### 1. Structured output schema

**File**: `packages/code-reviewer/src/schemas/review.ts`

**Intent**: Replace the inline `reviewSummarySchema` with two zod schemas: a `findingSchema` for individual issues and a `reviewOutputSchema` that composes it with `summary` and `verdict`. This is what lets a future eval grader assert against individual findings instead of an unstructured string list.

**Contract**: Exports `findingSchema`, `reviewOutputSchema` (both zod schemas), and their inferred types `Finding` and `ReviewOutput`. `findingSchema` fields: `file: string`, `line: number` (optional, integer), `severity: enum("blocker" | "major" | "minor" | "nit")`, `category: string` (short kebab-case slug, e.g. `"correctness"`, `"security"`), `summary: string`. `reviewOutputSchema` fields: `summary: string`, `verdict: enum("approve" | "request_changes" | "comment")` (unchanged from today), `findings: array(findingSchema)`. Every field carries a `.describe()` matching the style already used in the current `reviewSummarySchema`.

#### 2. Prompt content

**File**: `packages/code-reviewer/src/prompts/review.ts`

**Intent**: Give the agent instructions that establish it as a diff reviewer who uses the `readFile` tool for context, prioritizes correctness/security over style, and only reports genuine issues — plus a small helper to wrap a raw diff string into the user prompt.

**Contract**: Exports `reviewInstructions: string` (the agent's `instructions` value — tells it to read the diff, use `readFile` for context it can't see, prioritize correctness then security then maintainability, and require every finding to reference a file) and `buildReviewPrompt(diff: string): string` (wraps the diff in a fenced ` ```diff ` block with a one-line instruction to review it).

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `npm run typecheck` (run from `packages/code-reviewer/`)

#### Manual Verification:

- Read `schemas/review.ts` and `prompts/review.ts` and confirm the schema field descriptions and instructions read clearly and match the intent above

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual review was successful before proceeding to the next phase.

---

## Phase 2: Tools & Agent Factory

### Overview

Build the sandboxed `readFile` tool and the `createCodeReviewAgent` factory that wires model configuration, the schema, the prompt, the tool, and loop control together into a reusable `ToolLoopAgent`.

### Changes Required:

#### 1. Sandboxed read-file tool

**File**: `packages/code-reviewer/src/tools/read-file.ts`

**Intent**: Let the agent read a file from the repository under review for context the diff alone doesn't show, without being able to escape the repo root.

**Contract**: Exports `readFileTool` built with `tool()` from `ai`. `inputSchema: { path: string }` (repo-relative path). `contextSchema: { repoRoot: string }` (absolute path, supplied per-call via `toolsContext`, per [[Key Discoveries]]). `execute` resolves `path.resolve(repoRoot, path)` and rejects (throws) if the resolved path is not equal to or inside `repoRoot` — the check must handle both the exact-root case and the subdirectory case (e.g. compare against `repoRoot` and `path.join(repoRoot, path.sep)` as a prefix) so a traversal like `../../etc/passwd` is rejected. Reads the file as UTF-8 and truncates the returned string (with a trailing truncation marker) if it exceeds roughly 20,000 characters, to keep a single large file from blowing the context budget.

#### 2. Tool set barrel

**File**: `packages/code-reviewer/src/tools/index.ts`

**Intent**: Single import surface for the agent factory's `tools` option.

**Contract**: Exports `reviewTools = { readFile: readFileTool }`.

#### 3. Agent factory

**File**: `packages/code-reviewer/src/agent/index.ts`

**Intent**: The package's main reusable export — builds a fully configured `ToolLoopAgent` from optional overrides, defaulting to env vars, without throwing at import time.

**Contract**: Exports `createCodeReviewAgent(config?: { apiKey?: string; model?: string }): ToolLoopAgent<...>`. Inside the factory (not at module scope): resolves `apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY`, throwing the same `"Missing OPENROUTER_API_KEY environment variable"` error as today if unset; resolves `modelId = config.model ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5"`; constructs the OpenRouter provider and model; returns `new ToolLoopAgent({ model, instructions: reviewInstructions, tools: reviewTools, output: Output.object({ schema: reviewOutputSchema }), stopWhen: isStepCount(8) })`. Also re-exports `reviewOutputSchema`, `type ReviewOutput`, and `type Finding` from `../schemas/review.js` so a consumer (including a future promptfoo provider) only needs to import from `agent/index.ts`.

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `npm run typecheck` (run from `packages/code-reviewer/`)

#### Manual Verification:

- From a scratch script or `node --import tsx` REPL, call `createCodeReviewAgent().generate({ prompt: buildReviewPrompt(<sample diff>), toolsContext: { readFile: { repoRoot: <a real directory> } } })` and confirm the model calls `readFile` at least once and returns output matching `reviewOutputSchema`
- Confirm a path-traversal attempt (e.g. requesting `../../../etc/passwd` through the tool) is rejected by the sandbox check rather than reading outside `repoRoot`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: CLI Rewire & Verification

### Overview

Replace `src/index.ts`'s hardcoded demo with an argv-driven CLI that reads a real diff file and runs it through `createCodeReviewAgent`, and confirm the whole package builds and runs end-to-end.

### Changes Required:

#### 1. CLI entry point

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Turn the entry point into a minimal, real manual-testing path: take a diff file path from the command line, review it against the current working directory as the repo root, print the structured result.

**Contract**: `main()` reads `process.argv[2]` as the diff file path; if missing, prints a one-line usage message to `stderr` and sets `process.exitCode = 1` without throwing. Otherwise reads the file as UTF-8, calls `createCodeReviewAgent().generate({ prompt: buildReviewPrompt(diff), toolsContext: { readFile: { repoRoot: process.cwd() } } })`, and `console.log(JSON.stringify(output, null, 2))`. The top-level `main().catch(...)` error handler from the current file is unchanged.

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `npm run typecheck` (run from `packages/code-reviewer/`)
- Build succeeds: `npm run build` (run from `packages/code-reviewer/`)

#### Manual Verification:

- Run `npm run dev -- <path-to-a-real-diff-file>` (e.g. a `git diff` of an actual change saved to a file) from `packages/code-reviewer/` and confirm it prints valid JSON matching `reviewOutputSchema` with at least a plausible `summary` and `verdict`
- Run `npm run dev` with no argv path and confirm it prints a usage message and exits with a non-zero code instead of throwing an unhandled error

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None added in this change — no test framework is installed, and adding one is explicitly out of scope (see "What We're NOT Doing"). Future promptfoo eval work is expected to be the primary regression net for prompt/schema/tool behavior.

### Integration Tests:

- None added in this change, for the same reason.

### Manual Testing Steps:

1. From `packages/code-reviewer/`, run `npm run typecheck` after each phase and confirm it's clean.
2. After Phase 2, exercise `createCodeReviewAgent` directly (scratch script) against a small real diff and a real `repoRoot`, confirming a `readFile` tool call happens and the output matches `reviewOutputSchema`.
3. After Phase 2, deliberately request a path outside `repoRoot` through the tool and confirm it's rejected.
4. After Phase 3, run `npm run build` then `npm run dev -- <diff-file>` end-to-end and inspect the printed JSON.
5. After Phase 3, run `npm run dev` with no arguments and confirm the usage-message / exit-code path works.

## Performance Considerations

`stopWhen: isStepCount(8)` bounds the number of model round-trips (and therefore latency/cost) per review; the 20,000-character truncation on `readFile` results prevents a single large file from dominating the context window. Neither is expected to need tuning in this change — revisit once real eval data is available.

## Migration Notes

Not applicable — no persisted data or existing external consumers of this package.

## References

- AI SDK `ToolLoopAgent` reference: `packages/code-reviewer/node_modules/ai/docs/07-reference/01-ai-sdk-core/16-tool-loop-agent.mdx`
- AI SDK building-agents guide (tools/context/output patterns used throughout this plan): `packages/code-reviewer/node_modules/ai/docs/03-agents/02-building-agents.mdx`
- Bundled skill instructions: `packages/code-reviewer/.agents/skills/ai-sdk/SKILL.md`
- Current implementation being replaced: `packages/code-reviewer/src/index.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schemas & Prompts Modules

#### Automated

- [x] 1.1 Typecheck passes: `npm run typecheck` — 8ee5551

#### Manual

- [x] 1.2 Read `schemas/review.ts` and `prompts/review.ts` and confirm the schema field descriptions and instructions read clearly and match the intent above — 8ee5551

### Phase 2: Tools & Agent Factory

#### Automated

- [x] 2.1 Typecheck passes: `npm run typecheck` — 365ee0d

#### Manual

- [x] 2.2 Call `createCodeReviewAgent().generate(...)` against a sample diff and repo root and confirm a `readFile` tool call and schema-matching output — 365ee0d
- [x] 2.3 Confirm a path-traversal attempt through the `readFile` tool is rejected — 365ee0d

### Phase 3: CLI Rewire & Verification

#### Automated

- [x] 3.1 Typecheck passes: `npm run typecheck` — 9cb0afb
- [x] 3.2 Build succeeds: `npm run build` — 9cb0afb

#### Manual

- [x] 3.3 `npm run dev -- <diff-file>` prints valid JSON matching `reviewOutputSchema` — 9cb0afb
- [x] 3.4 `npm run dev` with no argv path prints a usage message and exits non-zero — 9cb0afb
