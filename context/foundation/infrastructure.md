---
project: Beer Recipe Builder
researched_at: 2026-05-23
recommended_platform: Cloudflare Workers + Pages
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

The project is already built with the `@astrojs/cloudflare` adapter and targets Cloudflare Pages — deploying here requires zero migration. The platform scores Pass on all five agent-friendly criteria (CLI-first, managed/serverless, agent-readable docs, stable deploy API, MCP integration) and its free tier (100K requests/day) exceeds this MVP's expected traffic by orders of magnitude. Combined with the developer's cost-minimization priority, Cloudflare is the only $0 option that requires no code changes whatsoever.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare** | Pass | Pass | Pass | Pass | Pass | 5/5 |
| **Vercel** | Pass | Pass | Pass | Pass | Partial | 4.5/5 |
| **Netlify** | Pass | Pass | Partial | Pass | Pass | 4.5/5 |
| **Fly.io** | Pass | Partial | Partial | Pass | Fail | 3/5 |
| **Render** | Pass | Pass | Partial | Partial | Partial | 3.5/5 |
| **Railway** | Pass | Pass | Partial | Partial | Fail | 3/5 |

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

Zero migration cost is the decisive factor. The project's `astro.config.mjs` already integrates `@astrojs/cloudflare`, `wrangler.toml` is configured, and env vars follow Cloudflare's binding model. The free tier (100K req/day, unlimited static assets) is absurdly generous for a small-user-base MVP. The platform publishes `llms.txt` and `llms-full.txt` for agent-readable documentation, offers a GA remote MCP server at `mcp.cloudflare.com/mcp`, and provides deterministic `wrangler deploy` / `wrangler rollback` operations. Hyperdrive provides connection pooling to Supabase's PostgreSQL. All core services (Workers, Pages, KV, R2, Queues, D1) are GA.

#### 2. Vercel

Strong runner-up with a $0 Hobby tier (1M invocations/month) and excellent agent tooling (llms-full.txt, Vercel MCP in Public Beta). The `@astrojs/vercel` adapter is mature (v10.x for Astro 6), and Supabase integrates via the Vercel Marketplace. The gap vs. Cloudflare: requires an adapter swap (non-trivial config change), MCP is still in beta, and deprecated storage products (Postgres, KV) mean relying on external providers anyway. No WebSocket support, but that's irrelevant for this app.

#### 3. Netlify

Official Netlify MCP Server (GA, v1.15) is the strongest MCP offering in the pool. Astro 6 support is confirmed ("just works" per Netlify's March 2026 changelog). However, the credit-based free tier (300 credits/month) is severely limiting for iterative MVP development — each production deploy costs 15 credits, giving only ~20 deploys before all sites pause until next billing cycle. This directly conflicts with the "minimize cost" priority during active 3-week development. The adapter swap to `@astrojs/netlify` adds migration friction.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. **workerd is not Node.js.** The V8 isolate runtime lacks `fs`, `net`, `child_process`. Some npm packages (native bindings, CommonJS-only) are incompatible — discovered at build time or worse, at runtime.
2. **Worker size limit (3 MB free, 10 MB paid).** An Astro 6 SSR bundle with React 19, shadcn/ui, and calculation logic could approach the free-tier limit as features grow.
3. **Supabase connection overhead.** Workers can't maintain persistent DB connections. Every request opens a new connection. Hyperdrive mitigates but adds configuration complexity.
4. **Debug story is weaker than Node.js.** `wrangler dev` doesn't perfectly mirror production behavior (bindings, caching, request limits). Some bugs only reproduce in production.
5. **Vendor lock-in via runtime.** Leaving Cloudflare requires an adapter swap and rewriting any Cloudflare-specific API usage (KV, D1, Durable Objects).

### Pre-Mortem — How This Could Fail

The team deployed their Astro 6 beer recipe builder on Cloudflare Pages. Initially everything worked: the wizard loaded, calculations ran client-side in React islands, and recipes saved to Supabase. But three months in, the developer added a PDF export feature (FR-013) using a popular library that relied on `canvas` and `fs` — both unavailable in workerd. After two days of debugging cryptic bundler errors, they realized the library was fundamentally incompatible. They tried a WASM alternative, but the compiled binary pushed the Worker past the 3 MB free-tier limit. The $5/mo paid plan solved the size issue, but the WASM PDF library produced subtly different output than expected. Meanwhile, Supabase cold connections added 200-400ms to the first request after idle periods. The developer spent hours reading Hyperdrive docs that could have been spent building features. What started as "zero-cost, zero-config" became a time sink of runtime compatibility research.

### Unknown Unknowns

- **`import.meta.env` is inlined at build time in Astro 6 on Cloudflare.** Runtime secrets must use `astro:env/server` or the Cloudflare bindings API. Mixing these up leaks secrets into the client bundle.
- **Free-tier CPU limit is 10ms per invocation.** Complex server-side brewing calculations (IBU with multiple hop additions) could exceed this on cold starts. Paid plan raises it to 30ms (bundled).
- **Preview deploys on Pages require Cloudflare Access (paid add-on) to password-protect.** Without it, anyone with the preview URL can access staging environments.
- **wrangler rollback rolls back code but not database migrations.** If a deploy includes a Supabase migration that breaks data, rolling back the Worker doesn't undo the schema change.
- **Prerender + relative fetch bug:** workerd rejects `fetch('/')` during prerender — Supabase Auth triggers this. Mitigate with `prerenderEnvironment: 'node'` or `export const prerender = false` on affected pages.

## Operational Story

- **Preview deploys**: Every push to a non-production branch generates a unique `*.pages.dev` preview URL automatically. Fork PRs also get previews. URLs are public unless Cloudflare Access (paid) is configured for protection.
- **Secrets**: Environment variables and secrets are set via `wrangler secret put <NAME>` (encrypted at rest, per-environment). In local dev, secrets go in `.dev.vars` (gitignored). For CI, use GitHub Actions secrets injected into `wrangler deploy`.
- **Rollback**: `wrangler rollback [VERSION_ID]` — instant rollback to any of the last 100 deployed versions. Typical time-to-revert: seconds. Caveat: does not revert database schema changes (Supabase migrations are one-way unless manually reversed).
- **Approval**: All deploys can run unattended via CLI/CI. No human approval gate by default. To add protection: configure Cloudflare Access policies or branch-based deployment rules (production branch only deploys to prod).
- **Logs**: `wrangler tail` streams live request logs (filterable by status, search term, IP). `wrangler tail --format json` for structured output. Historical logs available via Logpush (paid) or the Cloudflare dashboard.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| npm package incompatible with workerd runtime | Devil's advocate | M | M | Check compatibility before adding deps; use `node_compat = true` in wrangler.toml for basic polyfills |
| Worker bundle exceeds 3 MB free-tier limit | Devil's advocate | L | M | Monitor bundle size in CI; upgrade to $5/mo paid plan if needed |
| Supabase cold connection latency (200-400ms first request) | Devil's advocate | M | L | Configure Hyperdrive for connection pooling; accept latency for low-traffic MVP |
| PDF export library incompatible with workerd | Pre-mortem | M | M | Use client-side PDF generation (jsPDF, browser print-to-PDF) instead of server-side; FR-013 is nice-to-have |
| Secrets leaked via import.meta.env inlining | Unknown unknowns | L | H | Use `astro:env/server` exclusively for secrets; enable Cloudflare secret scanning |
| CPU limit exceeded on complex calculations | Unknown unknowns | L | L | Keep brewing calculations in React (client-side); server only persists results |
| Preview URLs publicly accessible | Unknown unknowns | M | L | Acceptable for MVP; add Cloudflare Access before sharing sensitive staging data |
| DB migration not reversible on code rollback | Unknown unknowns | L | H | Test migrations locally with `supabase db reset`; keep migrations backward-compatible |
| Prerender relative fetch bug breaks auth pages | Research finding | M | M | Set `export const prerender = false` on all auth-related pages (already done in project) |

## Getting Started

1. **Verify wrangler is installed and authenticated:**
   ```bash
   npx wrangler --version
   npx wrangler login
   ```

2. **Confirm local dev works with the existing setup:**
   ```bash
   npm run dev
   ```
   The Astro dev server with `@astrojs/cloudflare` already uses workerd runtime locally via Vite's Cloudflare integration.

3. **Deploy to Cloudflare Pages:**
   ```bash
   npx wrangler pages deploy dist/
   ```
   Or configure Git integration in the Cloudflare dashboard for auto-deploy on push.

4. **Set production secrets:**
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_KEY
   ```

5. **Verify deployment:**
   ```bash
   npx wrangler tail --format json
   ```
   Open the generated `.pages.dev` URL and confirm auth flow works end-to-end.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (covered separately by GitHub Actions in `.github/workflows/ci.yml`)
- Production-scale architecture (multi-region, HA, DR)
- Cloudflare Access configuration for preview protection
- Hyperdrive connection pooling setup (optimization, not MVP-critical)
