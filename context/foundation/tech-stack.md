---
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
---

## Why this stack

Solo hobbyist building a beer recipe wizard web app with auth in 3 weeks of after-hours work. The short timeline and solo profile favor a batteries-included, TypeScript-first starter that handles auth, database, and deployment out of the box. The 10x Astro Starter is the recommended default for web apps in JS/TS and clears all four agent-friendly quality gates — typed, convention-based, popular in training data, and well-documented. Supabase covers auth and PostgreSQL persistence without additional integration work. Cloudflare Pages provides edge deployment with zero-ops hosting. Bootstrapper confidence is first-class — scaffolding is expected to be smooth with occasional manual steps.
