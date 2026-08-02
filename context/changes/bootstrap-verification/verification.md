---
bootstrapped_at: 2026-05-20T23:48:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: beer-recipe-builder
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: beer-recipe-builder
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Solo hobbyist building a beer recipe wizard web app with auth in 3 weeks of after-hours work. The short timeline and solo profile favor a batteries-included, TypeScript-first starter that handles auth, database, and deployment out of the box. The 10x Astro Starter is the recommended default for web apps in JS/TS and clears all four agent-friendly quality gates — typed, convention-based, popular in training data, and well-documented. Supabase covers auth and PostgreSQL persistence without additional integration work. Cloudflare Pages provides edge deployment with zero-ops hosting. Bootstrapper confidence is first-class — scaffolding is expected to be smooth with occasional manual steps.

## Pre-scaffold verification

| Signal      | Value   | Severity | Notes                                                   |
| ----------- | ------- | -------- | ------------------------------------------------------- |
| npm package | not run | —        | cmd_template uses `git clone`, not an npm create-\* CLI |
| GitHub repo | not run | —        | `gh` CLI not installed; recency check unavailable       |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently (no pre-existing .gitignore in cwd)
**.bootstrap-scaffold/.git/ deleted**: yes (upstream starter history removed before move-up)
**.bootstrap-scaffold cleanup**: deleted

Files moved:

- `.github/` (directory)
- `.husky/` (directory)
- `.vscode/` (directory)
- `node_modules/` (directory)
- `public/` (directory)
- `src/` (directory)
- `supabase/` (directory)
- `.env.example`
- `.gitignore`
- `.nvmrc`
- `.prettierrc.json`
- `astro.config.mjs`
- `CLAUDE.md`
- `components.json`
- `eslint.config.js`
- `package-lock.json`
- `package.json`
- `README.md`
- `tsconfig.json`
- `wrangler.jsonc`

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 10 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/3/0 direct of total 0/1/10/0

#### CRITICAL findings

None.

#### HIGH findings

- **devalue** v5.6.3–5.8.0 (transitive)
  Advisory: [GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p) — DoS via sparse array deserialization
  CVSS: 7.5
  Fix: update devalue (fix available via `npm audit fix`)

#### MODERATE findings

- **@astrojs/check** >=0.9.3 (direct) — transitive via @astrojs/language-server → volar-service-yaml → yaml-language-server → yaml (stack overflow via deeply nested YAML). Fix: downgrade to 0.9.2 (semver-major).
- **@astrojs/cloudflare** >=12.2.4 (direct) — transitive via @cloudflare/vite-plugin → miniflare/wrangler → ws (uninitialized memory disclosure). Fix: downgrade to 12.6.13 (semver-major).
- **@astrojs/language-server** >=2.14.0 (transitive) — via volar-service-yaml.
- **@cloudflare/vite-plugin** >=0.0.7 (transitive) — via miniflare, wrangler, ws.
- **miniflare** >=3.20250204.0 (transitive) — via ws.
- **volar-service-yaml** <=0.0.70 (transitive) — via yaml-language-server.
- **wrangler** >=3.108.0 (direct) — via miniflare → ws. Fix: downgrade to 3.107.3 (semver-major).
- **ws** 8.0.0–8.20.0 (transitive) — [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx): uninitialized memory disclosure. CVSS: 4.4.
- **yaml** 2.0.0–2.8.2 (transitive) — [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp): stack overflow via deeply nested YAML collections. CVSS: 4.3.
- **yaml-language-server** (transitive) — via yaml.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
