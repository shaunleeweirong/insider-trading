# Congressional Stock Trading Tracker — SaaS MVP

## TL;DR

> **Quick Summary**: Build a QuiverQuant-like SaaS web app that tracks US congressional stock trades (Senate + House), allows searching by politician, and offers freemium access with premium email alerts, full history, and data export.
> 
> **Deliverables**:
> - Full-stack Next.js app deployed on Vercel
> - Supabase-backed database with automated FMP data sync every 4-6 hours
> - Freemium model with Stripe billing ($9.99/mo premium)
> - Email alerts via Resend when followed politicians trade
> - Clean minimal design (light mode, responsive)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 7 waves
> **Critical Path**: Scaffold → DB Schema → Auth → FMP Client → Sync Pipeline → Core Pages → Stripe → Alerts → Landing → Deploy

---

## Context

### Original Request
Build a QuiverQuant-like app that tracks senator trades, insider trading, and allows searching by politicians. Find accurate, cost-effective data sources.

### Interview Summary
**Key Discussions**:
- **MVP scope**: Congressional trading only (Senate + House). Corporate insider trading (SEC Form 4) deferred to V2.
- **Tech stack**: Next.js (App Router) + Supabase (Postgres + Auth) + Stripe + Vercel
- **Data source**: Financial Modeling Prep API ($22/mo Starter plan) — endpoints: `/stable/senate-trading`, `/stable/senate-trades-by-name`, `/stable/house-disclosure`
- **Free government APIs**: congress.gov for politician metadata, unitedstates/images (GitHub) for headshots
- **Monetization**: Freemium — Free tier (last 30 days of trades, basic search, politician profiles), Premium $9.99/mo (alerts, full history, data export, performance tracking)
- **Alerts**: Email only (via Resend) when a followed politician makes a new trade
- **Data sync**: Vercel Cron every 4-6 hours → Next.js API route → FMP → Supabase
- **Design**: Clean minimal, light mode, modern SaaS aesthetic (not finance dark mode)
- **Testing**: TDD with vitest + React Testing Library

**Research Findings**:
- FMP trade amounts are reported as string ranges (`"$1,001 - $15,000"`), not exact numbers — need parsing
- Politician names from FMP have inconsistent formatting — need normalization layer
- Tickers may be missing from some filings; only `security_name` present — need ticker resolution
- Supabase auth must use `@supabase/ssr` (not deprecated `@supabase/auth-helpers-nextjs`)
- Stripe webhook handler must use `request.text()` not `request.json()` for signature verification
- Vercel Hobby plan only allows 2 cron jobs at daily minimum; Pro ($20/mo) needed for 4-6h frequency
- Resend free tier: 3,000 emails/month (sufficient for early-stage SaaS)

### Metis Review
**Identified Gaps** (addressed):
- Amount range parsing strategy: Store as raw string + parsed min/max integers
- FMP API down during sync: Retry with exponential backoff, log to `sync_runs` table
- Historical data backfill: One-time script separate from recurring sync
- Politician lifecycle (retirement, chamber switch): `is_active` flag, periodic metadata refresh
- Performance metric definition: Simple "return since disclosure date" for MVP
- Premium downgrade handling: Keep followed list, stop alerts, show upgrade prompt
- Legal disclaimer: Required on all pages displaying financial data
- Concurrent sync prevention: Mutex via `sync_runs` table status check
- Trade deduplication: Composite unique constraint on (politician_id, ticker, transaction_date, amount_range_raw, transaction_type)

---

## Work Objectives

### Core Objective
Build and deploy a freemium SaaS web application that aggregates US congressional stock trades from the Financial Modeling Prep API, enabling users to search by politician, view trade history, track performance, and subscribe for premium features including email alerts.

### Concrete Deliverables
- Next.js 14+ App Router application with TypeScript
- 10+ pages: landing, auth (login/signup/forgot-password), dashboard/trade feed, politician directory, politician detail, stock page, pricing, alerts settings, billing settings, admin sync status
- Supabase database with 8 tables, RLS policies, and automated migrations
- FMP data sync pipeline (Vercel Cron → API route → FMP → Supabase)
- Stripe subscription billing with webhook handler and customer portal
- Email alert system via Resend
- Deployed on Vercel with custom domain support

### Definition of Done
- [ ] `bun test` — all tests pass (0 failures)
- [ ] `bun run build` — production build succeeds with no TypeScript errors
- [ ] Data sync runs successfully end-to-end (FMP → Supabase) with deduplication
- [ ] Free user can browse last 30 days of trades and search politicians
- [ ] Premium user ($9.99/mo via Stripe) can access full history, export CSV, and receive email alerts
- [ ] All API routes return appropriate 401/403 for unauthenticated/unauthorized requests

### Must Have
- Congressional trade data (Senate + House) synced from FMP
- Politician search with filtering by party and chamber
- Politician detail page with trade history and simple performance chart
- Supabase auth (email/password signup, login, logout, forgot password)
- Stripe subscription billing ($9.99/mo) with webhook sync
- Email alerts when followed politicians make new trades (premium only)
- Trade data deduplication on sync
- Sync status tracking in `sync_runs` table
- Legal disclaimer on all data pages
- Responsive design (mobile-friendly)
- CSV data export (premium only)

### Must NOT Have (Guardrails)
- NO corporate insider trading (SEC Form 4) — V2
- NO dark mode — light mode only
- NO mobile native app — web responsive only
- NO social features (comments, user follows, social feed)
- NO backtesting engine or trading strategy simulation
- NO real-time WebSocket price streaming — prices fetched on page load, cached
- NO user portfolio tracking — users don't input their own trades
- NO AI/ML predictions or sentiment analysis
- NO admin CRUD for politicians — data from API only
- NO blog or CMS
- NO annual billing — monthly only for MVP
- NO free trial — freemium forever model
- NO internationalization — English only
- NO more than ONE email alert type ("new trade detected")
- NO ORM (Prisma/Drizzle) — use Supabase client directly
- NO state management library — React Server Components + URL state
- NO Pages Router — App Router only
- NO Supabase Realtime — unnecessary for 4-6h sync cadence
- NO Edge Functions for data sync — Vercel Cron + API route only
- NO more than 3 filters on trade search (text search, chamber, party)
- NO candlestick charts or technical indicators — one simple line chart per politician (recharts)
- NO Playwright/Cypress — vitest + React Testing Library for MVP

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: vitest + @testing-library/react
- **Each task follows**: Write failing test → implement to make it pass → refactor

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL or vitest) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: Project scaffold + config [quick]
├── Task 2: Core dependencies + vitest setup [quick]
├── Task 3: shadcn/ui + Tailwind design tokens [quick]
├── Task 4: Environment variable validation (Zod) [quick]
├── Task 5: Supabase migration — politicians, trades, profiles tables [quick]
├── Task 6: Supabase migration — subscriptions, followed_politicians, sync_runs, stock_prices [quick]
└── Task 7: RLS policies for all tables [quick]

Wave 2 (Auth + Data Client — after Wave 1):
├── Task 8: Supabase auth setup (@supabase/ssr) + middleware [deep]
├── Task 9: Auth pages (login, signup, forgot-password) [visual-engineering]
├── Task 10: FMP API client + Zod validation [deep]
├── Task 11: Politician name normalization utility [quick]
└── Task 12: Stock price fetch + cache service [quick]

Wave 3 (Sync Pipeline — after Wave 2):
├── Task 13: Trade sync service (fetch, normalize, dedupe, upsert) [deep]
├── Task 14: Vercel Cron API route + sync_runs logging [unspecified-high]
├── Task 15: Historical data backfill script [unspecified-high]
└── Task 16: App shell layout + navigation [visual-engineering]

Wave 4 (Core Pages — after Wave 3):
├── Task 17: Trade feed page (dashboard) [visual-engineering]
├── Task 18: Politician directory page (search + filters) [visual-engineering]
├── Task 19: Politician detail page (trades + performance chart) [deep]
├── Task 20: Stock page (trades for a ticker) [visual-engineering]
└── Task 21: CSV data export API [quick]

Wave 5 (Payments — after Wave 4):
├── Task 22: Stripe checkout + webhook handler [deep]
├── Task 23: Subscription sync + feature gating [deep]
├── Task 24: Pricing page + checkout integration [visual-engineering]
└── Task 25: Billing settings + Customer Portal [visual-engineering]

Wave 6 (Alerts + Polish — after Wave 5):
├── Task 26: Follow/unfollow politician API + alerts settings page [deep]
├── Task 27: Alert email sending via Resend (triggered during sync) [deep]
├── Task 28: Landing/marketing page [visual-engineering]
├── Task 29: Admin sync status dashboard [unspecified-high]
├── Task 30: Loading states, error boundaries, empty states [visual-engineering]
└── Task 31: SEO metadata + legal pages [quick]

Wave 7 (Deploy — after Wave 6):
├── Task 32: Rate limiting on public API routes [unspecified-high]
├── Task 33: Vercel deployment config + Stripe production [quick]
└── Task 34: Full test suite run + final fixes [deep]

Wave FINAL (Verification — after ALL tasks):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]
→ Present results → Get explicit user okay
```

### Critical Path
Task 1 → Task 5 → Task 8 → Task 10 → Task 13 → Task 14 → Task 17 → Task 22 → Task 26 → Task 33 → F1-F4 → user okay

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1-4 | — | 5-12 |
| 5-6 | 1, 4 | 7, 8, 10-15 |
| 7 | 5, 6 | 8, 13, 22 |
| 8 | 5, 7 | 9, 13, 17-21, 22-27 |
| 9 | 3, 8 | — |
| 10 | 1, 4 | 12, 13, 14, 15 |
| 11 | 1 | 13 |
| 12 | 5, 10 | 19 |
| 13 | 7, 8, 10, 11 | 14, 15, 27 |
| 14 | 13 | 27, 29 |
| 15 | 13 | — |
| 16 | 3 | 17-20, 24, 25, 28, 29 |
| 17 | 8, 13, 16 | — |
| 18 | 8, 16 | 19, 26 |
| 19 | 8, 12, 16, 18 | — |
| 20 | 8, 12, 16 | — |
| 21 | 8, 13 | — |
| 22 | 4, 7, 8 | 23, 24, 25 |
| 23 | 22 | 24, 25, 26, 27 |
| 24 | 16, 23 | — |
| 25 | 16, 23 | — |
| 26 | 8, 18, 23 | 27 |
| 27 | 13, 14, 23, 26 | — |
| 28 | 16 | — |
| 29 | 14, 16 | — |
| 30 | 16-20 | — |
| 31 | 1 | — |
| 32 | 8, 17-22 | F1-F4 |
| 33 | 14, 22 | F1-F4 |
| 34 | 32, 33 | F1-F4 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 7 | T1-T4 → `quick`, T5-T6 → `quick`, T7 → `quick` |
| 2 | 5 | T8 → `deep`, T9 → `visual-engineering`, T10 → `deep`, T11 → `quick`, T12 → `quick` |
| 3 | 4 | T13 → `deep`, T14 → `unspecified-high`, T15 → `unspecified-high`, T16 → `visual-engineering` |
| 4 | 5 | T17 → `visual-engineering`, T18 → `visual-engineering`, T19 → `deep`, T20 → `visual-engineering`, T21 → `quick` |
| 5 | 4 | T22 → `deep`, T23 → `deep`, T24 → `visual-engineering`, T25 → `visual-engineering` |
| 6 | 6 | T26 → `deep`, T27 → `deep`, T28 → `visual-engineering`, T29 → `unspecified-high`, T30 → `visual-engineering`, T31 → `quick` |
| 7 | 3 | T32 → `unspecified-high`, T33 → `quick`, T34 → `deep` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

### Wave 1 — Foundation (Start Immediately)

- [ ] 1. Project Scaffold + Config

  **What to do**:
  - Run `bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (accept defaults)
  - Verify the generated `package.json` has Next.js 14+, TypeScript, Tailwind CSS
  - Add `.nvmrc` with Node 20 LTS version
  - Update `tsconfig.json`: set `strict: true`, `noUncheckedIndexedAccess: true`
  - Add `src/lib/` directory for shared utilities
  - Add `src/types/` directory for shared TypeScript types
  - Create `.env.local.example` listing all required env vars (no values):
    ```
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    FMP_API_KEY=
    STRIPE_SECRET_KEY=
    STRIPE_WEBHOOK_SECRET=
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
    RESEND_API_KEY=
    NEXT_PUBLIC_APP_URL=
    ```
  - Verify `bun run dev` starts without errors
  - Verify `bun run build` completes with 0 errors

  **Must NOT do**:
  - Do NOT install any ORM (Prisma, Drizzle)
  - Do NOT add Pages Router files
  - Do NOT add dark mode config
  - Do NOT install state management libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward scaffolding — single-command generation + minor config tweaks
  - **Skills**: []
    - No specialized skills needed for project init
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not needed — no UI work in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2-4, but this should run FIRST as others depend on package.json)
  - **Parallel Group**: Wave 1 — runs first, Tasks 2-7 follow immediately after
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 10, 11, 31
  - **Blocked By**: None (first task)

  **References**:

  **Pattern References**:
  - None (greenfield project)

  **API/Type References**:
  - None (greenfield project)

  **External References**:
  - Next.js App Router docs: `https://nextjs.org/docs/app` — App Router conventions for `src/app/` structure
  - Tailwind CSS v3 docs: `https://tailwindcss.com/docs/configuration` — Verify Tailwind config matches Next.js defaults

  **WHY Each Reference Matters**:
  - Next.js docs confirm correct `create-next-app` flags and App Router directory conventions
  - Tailwind docs ensure config is compatible with shadcn/ui (Task 3)

  **Acceptance Criteria**:

  - [ ] `bun run dev` starts on localhost:3000 without errors
  - [ ] `bun run build` completes with 0 TypeScript errors
  - [ ] `src/app/page.tsx` exists (App Router)
  - [ ] `tsconfig.json` has `strict: true`
  - [ ] `.env.local.example` lists all 9 env vars
  - [ ] `src/lib/` and `src/types/` directories exist

  **QA Scenarios**:

  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Fresh project scaffold complete
    Steps:
      1. Run `bun run dev &` and wait 5 seconds
      2. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
      3. Kill dev server
    Expected Result: HTTP status code 200
    Failure Indicators: Non-200 status, connection refused, TypeScript compilation errors in terminal
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: Fresh project scaffold complete
    Steps:
      1. Run `bun run build 2>&1`
      2. Check exit code is 0
      3. Verify `.next/` directory was created
    Expected Result: Exit code 0, no TypeScript errors in output
    Failure Indicators: Non-zero exit code, "error TS" in output
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: Required directories and files exist
    Tool: Bash
    Preconditions: Scaffold complete
    Steps:
      1. Run `test -d src/lib && echo "PASS" || echo "FAIL"`
      2. Run `test -d src/types && echo "PASS" || echo "FAIL"`
      3. Run `test -f .env.local.example && echo "PASS" || echo "FAIL"`
      4. Run `grep -c "=" .env.local.example` — expect 9
    Expected Result: All PASS, 9 env vars listed
    Failure Indicators: Any FAIL, count != 9
    Evidence: .sisyphus/evidence/task-1-structure.txt
  ```

  **Commit**: YES
  - Message: `chore(scaffold): initialize Next.js project with TypeScript and Tailwind`
  - Files: All generated files + `.env.local.example`, `.nvmrc`
  - Pre-commit: `bun run build`

- [ ] 2. Core Dependencies + Vitest Setup

  **What to do**:
  - Install production dependencies: `bun add @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js resend zod recharts lucide-react`
  - Install dev dependencies: `bun add -d vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
  - Create `vitest.config.ts` at project root:
    ```ts
    import { defineConfig } from 'vitest/config'
    import react from '@vitejs/plugin-react'
    import path from 'path'

    export default defineConfig({
      plugins: [react()],
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
      },
      resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
      },
    })
    ```
  - Create `src/test/setup.ts` with `import '@testing-library/jest-dom'`
  - Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
  - Write a smoke test `src/test/smoke.test.ts`:
    ```ts
    import { describe, it, expect } from 'vitest'
    describe('smoke test', () => {
      it('should run tests', () => { expect(1 + 1).toBe(2) })
    })
    ```
  - Verify `bun test` passes with 1 test, 0 failures

  **Must NOT do**:
  - Do NOT install Jest (using vitest)
  - Do NOT install Playwright or Cypress
  - Do NOT add test scripts that use `next test`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package installation + config file creation — no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 1 (package.json must exist)
  - **Parallel Group**: Wave 1 — runs after Task 1, parallel with Tasks 3-7
  - **Blocks**: All subsequent tasks (test infrastructure)
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Vitest config docs: `https://vitest.dev/config/` — Configuration options for vitest.config.ts
  - Testing Library React docs: `https://testing-library.com/docs/react-testing-library/setup` — Setup with vitest

  **WHY Each Reference Matters**:
  - Vitest docs ensure correct config for Next.js App Router (jsdom environment, path aliases)
  - Testing Library setup ensures `@testing-library/jest-dom` matchers work globally

  **Acceptance Criteria**:

  - [ ] `bun test` runs and outputs: 1 test passed, 0 failures
  - [ ] `vitest.config.ts` exists with jsdom environment and `@/` alias
  - [ ] `src/test/setup.ts` imports `@testing-library/jest-dom`
  - [ ] All production deps installed (check `node_modules/@supabase/supabase-js` exists)

  **QA Scenarios**:

  ```
  Scenario: Vitest smoke test passes
    Tool: Bash
    Preconditions: Dependencies installed, vitest.config.ts created
    Steps:
      1. Run `bun test 2>&1`
      2. Check output contains "1 passed"
      3. Check exit code is 0
    Expected Result: "1 passed" in output, exit code 0
    Failure Indicators: "FAIL" in output, non-zero exit code, missing module errors
    Evidence: .sisyphus/evidence/task-2-vitest-smoke.txt

  Scenario: All production dependencies are installed
    Tool: Bash
    Preconditions: `bun add` commands completed
    Steps:
      1. Run `bun pm ls 2>/dev/null | grep -E "@supabase/supabase-js|stripe|resend|zod|recharts"` or check `node_modules`
      2. Verify each package directory exists in node_modules
    Expected Result: All 7 production packages found
    Failure Indicators: Any package missing from node_modules
    Evidence: .sisyphus/evidence/task-2-deps.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): add core dependencies and vitest test infrastructure`
  - Files: `package.json`, `bun.lockb`, `vitest.config.ts`, `src/test/setup.ts`, `src/test/smoke.test.ts`
  - Pre-commit: `bun test`

- [ ] 3. shadcn/ui + Tailwind Design Tokens

  **What to do**:
  - Run `bunx --bun shadcn@latest init` — select: New York style, Zinc base color, CSS variables YES
  - Install core components: `bunx --bun shadcn@latest add button card input label table badge separator skeleton tabs dialog dropdown-menu toast sheet avatar command`
  - Create `src/lib/utils.ts` if not already created by shadcn init (should have `cn()` utility)
  - Extend `tailwind.config.ts` with custom design tokens:
    ```ts
    // Add to theme.extend:
    colors: {
      'trade-buy': '#16a34a',   // green-600 for purchases
      'trade-sell': '#dc2626',  // red-600 for sales
      'party-dem': '#2563eb',   // blue-600 for Democrats
      'party-rep': '#dc2626',   // red-600 for Republicans
      'party-ind': '#9333ea',   // purple-600 for Independents
    }
    ```
  - Verify all shadcn components installed in `src/components/ui/`
  - Ensure `globals.css` has shadcn CSS variables (light mode only — no `.dark` block)

  **Must NOT do**:
  - Do NOT add a dark mode CSS variable block (`.dark { ... }`)
  - Do NOT modify the shadcn theme to dark mode
  - Do NOT install chart components from shadcn (using recharts directly)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI commands + minor config additions — no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Overkill for design token setup — no actual UI being built

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 1 (tailwind.config.ts must exist)
  - **Parallel Group**: Wave 1 — runs after Task 1, parallel with Tasks 2, 4-7
  - **Blocks**: Tasks 9, 16, 17-20, 24, 25, 28, 30
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - shadcn/ui installation: `https://ui.shadcn.com/docs/installation/next` — Next.js specific setup
  - shadcn/ui components: `https://ui.shadcn.com/docs/components/button` — Component API reference
  - Tailwind CSS custom colors: `https://tailwindcss.com/docs/customizing-colors` — Adding custom color tokens

  **WHY Each Reference Matters**:
  - shadcn docs ensure correct init flags for Next.js App Router + Tailwind CSS
  - Custom colors map directly to domain concepts (trade direction, political party) for consistent UI

  **Acceptance Criteria**:

  - [ ] `src/components/ui/button.tsx` exists (and all other listed components)
  - [ ] `src/lib/utils.ts` exports `cn()` function
  - [ ] `tailwind.config.ts` includes `trade-buy`, `trade-sell`, `party-dem`, `party-rep`, `party-ind` colors
  - [ ] `globals.css` has NO `.dark` block
  - [ ] `bun run build` still passes

  **QA Scenarios**:

  ```
  Scenario: shadcn components installed correctly
    Tool: Bash
    Preconditions: shadcn init and component install complete
    Steps:
      1. Run `ls src/components/ui/ | wc -l`
      2. Verify count >= 15 (button, card, input, label, table, badge, separator, skeleton, tabs, dialog, dropdown-menu, toast, sheet, avatar, command)
      3. Run `grep -l "export" src/components/ui/button.tsx`
    Expected Result: >= 15 component files, button.tsx has exports
    Failure Indicators: Missing component files, empty files
    Evidence: .sisyphus/evidence/task-3-shadcn-components.txt

  Scenario: Custom design tokens are available
    Tool: Bash
    Preconditions: tailwind.config.ts updated
    Steps:
      1. Run `grep "trade-buy" tailwind.config.ts`
      2. Run `grep "party-dem" tailwind.config.ts`
      3. Run `grep "party-rep" tailwind.config.ts`
    Expected Result: All three grep commands find matches
    Failure Indicators: No match for any custom color
    Evidence: .sisyphus/evidence/task-3-design-tokens.txt

  Scenario: No dark mode present
    Tool: Bash
    Preconditions: globals.css exists
    Steps:
      1. Run `grep -c "\.dark" src/app/globals.css`
    Expected Result: 0 matches (no dark mode block)
    Failure Indicators: Any matches found
    Evidence: .sisyphus/evidence/task-3-no-dark-mode.txt
  ```

  **Commit**: YES
  - Message: `chore(ui): install shadcn/ui components and custom design tokens`
  - Files: `components.json`, `tailwind.config.ts`, `src/app/globals.css`, `src/lib/utils.ts`, `src/components/ui/*`
  - Pre-commit: `bun run build`

- [ ] 4. Environment Variable Validation with Zod

  **What to do**:
  - TDD: Write test first in `src/lib/__tests__/env.test.ts`:
    - Test that valid env vars pass validation
    - Test that missing required vars throw descriptive errors
    - Test that `NEXT_PUBLIC_*` vars are correctly separated from server-only vars
  - Create `src/lib/env.ts`:
    ```ts
    import { z } from 'zod'

    const serverSchema = z.object({
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
      FMP_API_KEY: z.string().min(1),
      STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
      STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
      RESEND_API_KEY: z.string().startsWith('re_'),
    })

    const clientSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
      NEXT_PUBLIC_APP_URL: z.string().url(),
    })

    export const serverEnv = serverSchema.parse(process.env)
    export const clientEnv = clientSchema.parse(process.env)
    export type ServerEnv = z.infer<typeof serverSchema>
    export type ClientEnv = z.infer<typeof clientSchema>
    ```
  - Ensure tests mock `process.env` and validate both success and failure cases
  - Export schemas separately so they can be imported without triggering parse

  **Must NOT do**:
  - Do NOT use `t3-env` or any wrapper library — plain Zod schemas
  - Do NOT hardcode any env values
  - Do NOT validate env at build time (validate at runtime on first import)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small utility module with Zod schemas — straightforward TDD
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 1 (project exists) and Task 2 (Zod + vitest installed)
  - **Parallel Group**: Wave 1 — runs after Tasks 1+2, parallel with Tasks 3, 5-7
  - **Blocks**: Tasks 5, 6, 10, 22
  - **Blocked By**: Tasks 1, 2

  **References**:

  **External References**:
  - Zod docs: `https://zod.dev/?id=basic-usage` — Schema definition and `.parse()` usage
  - Next.js env vars: `https://nextjs.org/docs/app/building-your-application/configuring/environment-variables` — `NEXT_PUBLIC_` prefix convention

  **WHY Each Reference Matters**:
  - Zod docs show `.startsWith()` and `.url()` refinements used in the schema
  - Next.js docs clarify client vs server env var separation (NEXT_PUBLIC_ prefix)

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/__tests__/env.test.ts` — PASS (3+ tests, 0 failures)
  - [ ] `src/lib/env.ts` exports `serverEnv`, `clientEnv`, `ServerEnv`, `ClientEnv`
  - [ ] Missing env var produces a Zod error with the variable name
  - [ ] Invalid format (e.g., Stripe key not starting with `sk_`) throws

  **QA Scenarios**:

  ```
  Scenario: Env validation tests pass
    Tool: Bash
    Preconditions: env.ts and env.test.ts created
    Steps:
      1. Run `bun test src/lib/__tests__/env.test.ts 2>&1`
      2. Check output contains "passed" and 0 failures
    Expected Result: All tests pass
    Failure Indicators: Any test failure, import errors
    Evidence: .sisyphus/evidence/task-4-env-tests.txt

  Scenario: Missing env var throws descriptive error
    Tool: Bash
    Preconditions: env.ts exists
    Steps:
      1. Create a small script: `node -e "process.env = {}; require('./src/lib/env.ts')"` or equivalent bun command
      2. Capture stderr
    Expected Result: ZodError with field names of missing variables
    Failure Indicators: Generic error without field names, no error thrown
    Evidence: .sisyphus/evidence/task-4-env-missing-error.txt
  ```

  **Commit**: YES
  - Message: `feat(config): add Zod-validated environment variable schemas`
  - Files: `src/lib/env.ts`, `src/lib/__tests__/env.test.ts`
  - Pre-commit: `bun test src/lib/__tests__/env.test.ts`

- [ ] 5. Supabase Migration — Core Tables (politicians, trades, profiles)

  **What to do**:
  - Create `supabase/migrations/001_core_tables.sql` with:
  - **politicians** table:
    ```sql
    CREATE TABLE politicians (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      party TEXT CHECK (party IN ('Democrat', 'Republican', 'Independent')),
      chamber TEXT NOT NULL CHECK (chamber IN ('Senate', 'House')),
      state TEXT,
      district TEXT,
      bioguide_id TEXT UNIQUE,
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_politicians_normalized_name ON politicians(normalized_name);
    CREATE INDEX idx_politicians_party ON politicians(party);
    CREATE INDEX idx_politicians_chamber ON politicians(chamber);
    CREATE INDEX idx_politicians_state ON politicians(state);
    ```
  - **trades** table:
    ```sql
    CREATE TABLE trades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      politician_id UUID NOT NULL REFERENCES politicians(id),
      transaction_date DATE NOT NULL,
      disclosure_date DATE,
      ticker TEXT,
      asset_name TEXT NOT NULL,
      asset_type TEXT,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Purchase', 'Sale', 'Sale (Partial)', 'Sale (Full)', 'Exchange')),
      amount_range_raw TEXT NOT NULL,
      amount_min INTEGER,
      amount_max INTEGER,
      comment TEXT,
      source TEXT DEFAULT 'fmp',
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (politician_id, ticker, transaction_date, amount_range_raw, transaction_type)
    );
    CREATE INDEX idx_trades_politician_id ON trades(politician_id);
    CREATE INDEX idx_trades_transaction_date ON trades(transaction_date DESC);
    CREATE INDEX idx_trades_ticker ON trades(ticker);
    CREATE INDEX idx_trades_disclosure_date ON trades(disclosure_date DESC);
    ```
  - **profiles** table (extends Supabase auth.users):
    ```sql
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT,
      display_name TEXT,
      is_premium BOOLEAN DEFAULT false,
      is_admin BOOLEAN DEFAULT false,
      stripe_customer_id TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ```
  - Add trigger to auto-create profile on auth.users insert:
    ```sql
    CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    ```
  - Create TypeScript types in `src/types/database.ts` matching these tables

  **Must NOT do**:
  - Do NOT use an ORM migration tool
  - Do NOT add Realtime subscriptions
  - Do NOT add `owner` column to trades (politician_id is the relationship)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL DDL + TypeScript type definitions — well-defined schema, no ambiguity
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 6, 7 (but 7 depends on 5+6)
  - **Parallel Group**: Wave 1 — after Tasks 1, 4
  - **Blocks**: Tasks 7, 8, 10, 12, 13, 17-21, 22
  - **Blocked By**: Tasks 1, 4 (project exists, env validation for Supabase URL)

  **References**:

  **External References**:
  - Supabase migrations: `https://supabase.com/docs/guides/cli/local-development#database-migrations` — Migration file naming and structure
  - FMP Senate Trading API: `https://site.financialmodelingprep.com/developer/docs#senate-trading` — Field names to map to columns (transactionDate, ticker, assetDescription, type, amount)
  - Supabase auth trigger: `https://supabase.com/docs/guides/auth/managing-user-data` — Auto-create profile pattern

  **WHY Each Reference Matters**:
  - FMP API response shapes dictate column names and types (especially `amount` which is a string range)
  - Supabase trigger pattern is the canonical way to sync auth.users → profiles table
  - Migration naming convention ensures correct execution order

  **Acceptance Criteria**:

  - [ ] `supabase/migrations/001_core_tables.sql` exists with valid SQL
  - [ ] `src/types/database.ts` exports `Politician`, `Trade`, `Profile` types
  - [ ] Politicians table has: `normalized_name UNIQUE`, `party CHECK`, `chamber CHECK`
  - [ ] Trades table has: composite unique constraint, `amount_range_raw` + `amount_min` + `amount_max`
  - [ ] Profiles table references `auth.users(id)` with CASCADE delete
  - [ ] Auto-create profile trigger is defined

  **QA Scenarios**:

  ```
  Scenario: Migration SQL is syntactically valid
    Tool: Bash
    Preconditions: Migration file created
    Steps:
      1. Run `grep -c "CREATE TABLE" supabase/migrations/001_core_tables.sql`
      2. Verify count is 3 (politicians, trades, profiles)
      3. Run `grep "UNIQUE" supabase/migrations/001_core_tables.sql | wc -l`
      4. Verify at least 3 unique constraints (normalized_name, politician composite, stripe_customer_id)
    Expected Result: 3 CREATE TABLE statements, 3+ UNIQUE constraints
    Failure Indicators: Missing tables, missing constraints
    Evidence: .sisyphus/evidence/task-5-migration-structure.txt

  Scenario: TypeScript types match SQL schema
    Tool: Bash
    Preconditions: database.ts created
    Steps:
      1. Run `grep "politician_id" src/types/database.ts`
      2. Run `grep "amount_range_raw" src/types/database.ts`
      3. Run `grep "is_premium" src/types/database.ts`
    Expected Result: All key fields present in type definitions
    Failure Indicators: Missing fields, type mismatches
    Evidence: .sisyphus/evidence/task-5-types-match.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add core tables migration (politicians, trades, profiles)`
  - Files: `supabase/migrations/001_core_tables.sql`, `src/types/database.ts`
  - Pre-commit: `bun run build`

- [ ] 6. Supabase Migration — Supporting Tables (subscriptions, followed_politicians, sync_runs, stock_prices)

  **What to do**:
  - Create `supabase/migrations/002_supporting_tables.sql` with:
  - **subscriptions** table:
    ```sql
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      stripe_subscription_id TEXT UNIQUE NOT NULL,
      stripe_price_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
    ```
  - **followed_politicians** table:
    ```sql
    CREATE TABLE followed_politicians (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (user_id, politician_id)
    );
    CREATE INDEX idx_followed_user ON followed_politicians(user_id);
    CREATE INDEX idx_followed_politician ON followed_politicians(politician_id);
    ```
  - **sync_runs** table:
    ```sql
    CREATE TABLE sync_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source TEXT NOT NULL DEFAULT 'fmp',
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
      started_at TIMESTAMPTZ DEFAULT now(),
      completed_at TIMESTAMPTZ,
      trades_fetched INTEGER DEFAULT 0,
      trades_inserted INTEGER DEFAULT 0,
      trades_skipped INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_sync_runs_status ON sync_runs(status);
    CREATE INDEX idx_sync_runs_started_at ON sync_runs(started_at DESC);
    ```
  - **stock_prices** table:
    ```sql
    CREATE TABLE stock_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticker TEXT NOT NULL,
      date DATE NOT NULL,
      close_price NUMERIC(12,4) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (ticker, date)
    );
    CREATE INDEX idx_stock_prices_ticker_date ON stock_prices(ticker, date DESC);
    ```
  - Add TypeScript types for all 4 tables to `src/types/database.ts`

  **Must NOT do**:
  - Do NOT add Realtime configuration for any table
  - Do NOT add any billing/payment columns to profiles (that's in Task 5)
  - Do NOT add notification preferences columns (email alerts are binary: follow = alert)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: More SQL DDL + type additions — same pattern as Task 5
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Task 5 (different migration file)
  - **Parallel Group**: Wave 1 — after Tasks 1, 4
  - **Blocks**: Task 7, 12, 13, 14, 22, 26
  - **Blocked By**: Tasks 1, 4

  **References**:

  **External References**:
  - Stripe subscription statuses: `https://docs.stripe.com/billing/subscriptions/overview#subscription-statuses` — Valid status values for CHECK constraint
  - Supabase foreign keys: `https://supabase.com/docs/guides/database/tables#joining-tables-with-foreign-keys` — FK syntax for Supabase

  **WHY Each Reference Matters**:
  - Stripe docs define the exact subscription status strings to use in the CHECK constraint
  - Supabase FK docs ensure correct CASCADE behavior for user deletion

  **Acceptance Criteria**:

  - [ ] `supabase/migrations/002_supporting_tables.sql` exists with 4 CREATE TABLE statements
  - [ ] `src/types/database.ts` exports `Subscription`, `FollowedPolitician`, `SyncRun`, `StockPrice` types
  - [ ] Subscriptions has Stripe status CHECK constraint with 5 valid values
  - [ ] followed_politicians has UNIQUE (user_id, politician_id)
  - [ ] stock_prices has UNIQUE (ticker, date)

  **QA Scenarios**:

  ```
  Scenario: Supporting tables migration is valid
    Tool: Bash
    Preconditions: Migration file created
    Steps:
      1. Run `grep -c "CREATE TABLE" supabase/migrations/002_supporting_tables.sql`
      2. Verify count is 4
      3. Run `grep "REFERENCES" supabase/migrations/002_supporting_tables.sql | wc -l`
      4. Verify at least 4 foreign key references
    Expected Result: 4 tables, 4+ foreign keys
    Failure Indicators: Missing tables, missing foreign keys
    Evidence: .sisyphus/evidence/task-6-migration-structure.txt

  Scenario: All 8 table types exported from database.ts
    Tool: Bash
    Preconditions: database.ts updated
    Steps:
      1. Run `grep -c "export type" src/types/database.ts` or `grep -c "export interface" src/types/database.ts`
      2. Verify count >= 8 (Politician, Trade, Profile, Subscription, FollowedPolitician, SyncRun, StockPrice + any enums)
    Expected Result: >= 8 exported types
    Failure Indicators: Missing type exports
    Evidence: .sisyphus/evidence/task-6-types-count.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add supporting tables migration (subscriptions, follows, sync_runs, stock_prices)`
  - Files: `supabase/migrations/002_supporting_tables.sql`, `src/types/database.ts` (updated)
  - Pre-commit: `bun run build`

- [ ] 7. RLS Policies for All Tables

  **What to do**:
  - Create `supabase/migrations/003_rls_policies.sql` with Row Level Security for all 8 tables:
  - **politicians**: Enable RLS, allow SELECT for everyone (anon + authenticated). No INSERT/UPDATE/DELETE for regular users.
    ```sql
    ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view politicians" ON politicians FOR SELECT USING (true);
    CREATE POLICY "Service role can manage politicians" ON politicians FOR ALL USING (auth.role() = 'service_role');
    ```
  - **trades**: Enable RLS, allow SELECT for everyone. No INSERT/UPDATE/DELETE for regular users.
    ```sql
    ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view trades" ON trades FOR SELECT USING (true);
    CREATE POLICY "Service role can manage trades" ON trades FOR ALL USING (auth.role() = 'service_role');
    ```
  - **profiles**: Enable RLS, users can SELECT/UPDATE their own profile only.
    ```sql
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');
    ```
  - **subscriptions**: Users can SELECT their own subscriptions. Service role manages.
  - **followed_politicians**: Users can SELECT/INSERT/DELETE their own follows.
  - **sync_runs**: Authenticated users can SELECT (for admin dashboard). Service role manages.
  - **stock_prices**: SELECT for everyone. Service role manages.
  - TDD: Write tests in `src/lib/__tests__/rls.test.ts` that document the expected policies (these will be integration-style tests noting the policy names — actual RLS testing requires a running Supabase instance which is verified in QA)

  **Must NOT do**:
  - Do NOT add premium-gating at the RLS level (premium feature gating is at the API route level)
  - Do NOT allow regular users to INSERT/UPDATE politicians or trades
  - Do NOT bypass RLS with `SECURITY DEFINER` functions (except the profile trigger from Task 5)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL policy definitions — well-defined security rules, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 5 and 6 (tables must exist)
  - **Parallel Group**: Wave 1 — after Tasks 5+6, before Wave 2
  - **Blocks**: Tasks 8, 13, 22
  - **Blocked By**: Tasks 5, 6

  **References**:

  **External References**:
  - Supabase RLS: `https://supabase.com/docs/guides/auth/row-level-security` — Policy syntax and `auth.uid()` / `auth.role()` functions
  - Supabase RLS patterns: `https://supabase.com/docs/guides/auth/row-level-security#policies` — Common policy patterns (owner-based, public read)

  **WHY Each Reference Matters**:
  - RLS docs show correct `USING` clause syntax and built-in auth helper functions
  - Policy patterns ensure correct separation: public data (politicians, trades) vs private data (profiles, subscriptions, follows)

  **Acceptance Criteria**:

  - [ ] `supabase/migrations/003_rls_policies.sql` exists
  - [ ] All 8 tables have `ENABLE ROW LEVEL SECURITY`
  - [ ] Politicians and trades have public SELECT
  - [ ] Profiles restricted to own user (`auth.uid() = id`)
  - [ ] followed_politicians restricted to own user for INSERT/DELETE
  - [ ] Service role has full access on all tables

  **QA Scenarios**:

  ```
  Scenario: All tables have RLS enabled
    Tool: Bash
    Preconditions: Migration file created
    Steps:
      1. Run `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/003_rls_policies.sql`
      2. Verify count is 8
    Expected Result: 8 RLS enable statements
    Failure Indicators: Count < 8, missing tables
    Evidence: .sisyphus/evidence/task-7-rls-count.txt

  Scenario: Public tables have open SELECT, private tables restricted
    Tool: Bash
    Preconditions: Migration file created
    Steps:
      1. Run `grep "Anyone can view" supabase/migrations/003_rls_policies.sql | wc -l`
      2. Verify count >= 3 (politicians, trades, stock_prices)
      3. Run `grep "auth.uid()" supabase/migrations/003_rls_policies.sql | wc -l`
      4. Verify count >= 3 (profiles, subscriptions, followed_politicians)
    Expected Result: Public and private policies correctly assigned
    Failure Indicators: Missing policies, wrong table assignments
    Evidence: .sisyphus/evidence/task-7-rls-policies.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add RLS policies for all tables`
  - Files: `supabase/migrations/003_rls_policies.sql`, `src/lib/__tests__/rls.test.ts`
  - Pre-commit: `bun run build`

### Wave 2 — Auth + Data Client (After Wave 1)

- [ ] 8. Supabase Auth Setup (@supabase/ssr) + Middleware

  **What to do**:
  - Create `src/lib/supabase/server.ts` — server-side Supabase client using `@supabase/ssr`:
    - `createServerClient()` that reads/writes cookies via Next.js `cookies()` API
    - Used in Server Components and API routes
  - Create `src/lib/supabase/client.ts` — browser-side Supabase client:
    - `createBrowserClient()` for Client Components
  - Create `src/lib/supabase/middleware.ts` — middleware helper:
    - Refreshes auth session on every request
    - Updates cookies with fresh session
  - Create `src/middleware.ts` (Next.js middleware at project root):
    - Calls supabase middleware helper to refresh session
    - Define protected routes: `/dashboard`, `/settings`, `/api/export`, `/api/follow`
    - Redirect unauthenticated users to `/login` for protected routes
    - Allow public access to: `/`, `/login`, `/signup`, `/forgot-password`, `/pricing`, `/api/trades` (public), `/api/politicians` (public)
  - TDD: Write tests for:
    - Protected route detection logic
    - Public route allowlist
    - Session refresh behavior (mock cookies)

  **Must NOT do**:
  - Do NOT use `@supabase/auth-helpers-nextjs` (deprecated)
  - Do NOT use `createServerComponentClient` (old API)
  - Do NOT store session in localStorage (cookies only via SSR)
  - Do NOT add OAuth providers — email/password only for MVP

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth is security-critical — correct cookie handling, middleware integration, session refresh must be precise
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: No UI in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 9, 10, 11, 12
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 13, 17-27, 32
  - **Blocked By**: Tasks 5, 7 (profiles table + RLS must exist)

  **References**:

  **External References**:
  - Supabase SSR guide: `https://supabase.com/docs/guides/auth/server-side/nextjs` — Canonical setup for @supabase/ssr with Next.js App Router
  - Next.js middleware: `https://nextjs.org/docs/app/building-your-application/routing/middleware` — Middleware matcher config and cookies API
  - Supabase SSR package: `https://github.com/supabase/auth-helpers/tree/main/packages/ssr` — Source code for createServerClient/createBrowserClient

  **WHY Each Reference Matters**:
  - Supabase SSR guide is the ONLY correct way to set up auth with App Router (many tutorials use deprecated helpers)
  - Next.js middleware docs show correct `matcher` config to avoid running on static assets
  - SSR package source reveals exact cookie handler signatures needed

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/supabase/__tests__` — all tests pass
  - [ ] `src/lib/supabase/server.ts` exports `createServerClient` using `@supabase/ssr`
  - [ ] `src/lib/supabase/client.ts` exports `createBrowserClient` using `@supabase/ssr`
  - [ ] `src/middleware.ts` protects `/dashboard`, `/settings` routes
  - [ ] `src/middleware.ts` allows `/`, `/login`, `/signup`, `/pricing` without auth
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Auth middleware tests pass
    Tool: Bash
    Preconditions: Auth files created, tests written
    Steps:
      1. Run `bun test src/lib/supabase 2>&1`
      2. Verify all tests pass
    Expected Result: All tests pass, 0 failures
    Failure Indicators: Import errors, type errors, test failures
    Evidence: .sisyphus/evidence/task-8-auth-tests.txt

  Scenario: Protected route returns redirect for unauthenticated
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard`
      2. Check for 307 redirect to /login
    Expected Result: HTTP 307 redirect
    Failure Indicators: HTTP 200 (unprotected), HTTP 500 (error)
    Evidence: .sisyphus/evidence/task-8-protected-route.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): add Supabase SSR auth with middleware route protection`
  - Files: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`, tests
  - Pre-commit: `bun test && bun run build`

- [ ] 9. Auth Pages (Login, Signup, Forgot Password)

  **What to do**:
  - Create `src/app/(auth)/layout.tsx` — centered card layout for auth pages, no sidebar/nav
  - Create `src/app/(auth)/login/page.tsx`:
    - Email + password form using shadcn Input, Button, Label
    - "Don't have an account? Sign up" link
    - "Forgot password?" link
    - Server action or client-side call to `supabase.auth.signInWithPassword()`
    - Redirect to `/dashboard` on success
    - Show error message on failure (invalid credentials)
  - Create `src/app/(auth)/signup/page.tsx`:
    - Email + password + confirm password form
    - "Already have an account? Log in" link
    - Call `supabase.auth.signUp()`
    - Show "Check your email for confirmation" message
  - Create `src/app/(auth)/forgot-password/page.tsx`:
    - Email-only form
    - Call `supabase.auth.resetPasswordForEmail()`
    - Show "Check your email for reset link" message
  - Add form validation with Zod (email format, password min 8 chars, confirm match)
  - Style with clean minimal aesthetic — white card on light gray background

  **Must NOT do**:
  - Do NOT add OAuth buttons (Google, GitHub, etc.)
  - Do NOT add dark mode styles
  - Do NOT add "Remember me" checkbox
  - Do NOT add CAPTCHA
  - Do NOT use Pages Router (`pages/`) for auth

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI pages with forms, layout, and styling — visual output matters
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Clean minimal auth forms need good visual execution

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 10, 11, 12
  - **Parallel Group**: Wave 2
  - **Blocks**: None directly (but auth pages are prerequisite for manual QA)
  - **Blocked By**: Tasks 3 (shadcn), 8 (auth client)

  **References**:

  **Pattern References**:
  - `src/lib/supabase/client.ts` (from Task 8) — Browser Supabase client for auth calls

  **External References**:
  - Supabase email auth: `https://supabase.com/docs/guides/auth/passwords` — signUp, signInWithPassword, resetPasswordForEmail APIs
  - shadcn Form pattern: `https://ui.shadcn.com/docs/components/input` — Input + Label composition
  - Next.js route groups: `https://nextjs.org/docs/app/building-your-application/routing/route-groups` — `(auth)` group layout pattern

  **WHY Each Reference Matters**:
  - Supabase auth docs specify exact method signatures and return types for error handling
  - shadcn Input docs show correct composition with Label for accessible forms
  - Route groups allow shared auth layout without affecting URL structure

  **Acceptance Criteria**:

  - [ ] `/login` page renders email + password form
  - [ ] `/signup` page renders email + password + confirm password form
  - [ ] `/forgot-password` page renders email-only form
  - [ ] Form validation shows errors for invalid email, short password, mismatched confirm
  - [ ] Successful login redirects to `/dashboard`
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Login page renders and accepts input
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, auth pages created
    Steps:
      1. Navigate to http://localhost:3000/login
      2. Assert page contains input[type="email"] and input[type="password"]
      3. Assert page contains button with text "Log in" or "Sign in"
      4. Assert link to /signup exists
      5. Screenshot the page
    Expected Result: All form elements present, clean layout
    Failure Indicators: Missing inputs, broken layout, 404
    Evidence: .sisyphus/evidence/task-9-login-page.png

  Scenario: Signup validation rejects short password
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/signup
      2. Fill email: "test@example.com"
      3. Fill password: "123" (too short)
      4. Fill confirm password: "123"
      5. Click submit
      6. Assert error message about password length is visible
    Expected Result: Error message displayed, form not submitted
    Failure Indicators: Form submits without validation, no error shown
    Evidence: .sisyphus/evidence/task-9-signup-validation.png
  ```

  **Commit**: YES
  - Message: `feat(auth): add login, signup, and forgot-password pages`
  - Files: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 10. FMP API Client + Zod Response Validation

  **What to do**:
  - TDD: Write tests first in `src/lib/fmp/__tests__/client.test.ts`
  - Create `src/lib/fmp/client.ts`:
    - `fetchSenateTrades(page?: number)` — GET `/stable/senate-trading?apikey={key}`
    - `fetchSenateTradesByName(name: string)` — GET `/stable/senate-trades-by-name/{name}?apikey={key}`
    - `fetchHouseDisclosures(page?: number)` — GET `/stable/house-disclosure?apikey={key}`
    - `fetchStockQuote(ticker: string)` — GET `/api/v3/quote/{ticker}?apikey={key}`
    - `fetchHistoricalPrices(ticker: string, from: string, to: string)` — GET `/api/v3/historical-price-full/{ticker}?from={from}&to={to}&apikey={key}`
  - Create `src/lib/fmp/schemas.ts` — Zod schemas for each FMP response:
    - `SenateTrade` schema: `{ firstName, lastName, office, transactionDate, ticker, assetDescription, assetType, type, amount, comment, link }`
    - `HouseDisclosure` schema: similar fields adapted for House endpoint
    - `StockQuote` schema: `{ symbol, name, price, change, changesPercentage }`
    - `HistoricalPrice` schema: `{ date, close, high, low, open, volume }`
  - Validate ALL FMP responses through Zod schemas (`.safeParse()` — log warnings for invalid records but don't crash)
  - Add retry logic: 3 attempts with exponential backoff (1s, 2s, 4s) for 429/5xx responses
  - Add request timeout: 10 second timeout per request
  - Use `serverEnv.FMP_API_KEY` from `src/lib/env.ts`

  **Must NOT do**:
  - Do NOT use `axios` — use native `fetch`
  - Do NOT cache responses in this module (caching is at the service layer)
  - Do NOT parse the `amount` field here (parsing is in Task 11/13)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API client with retry logic, Zod validation, error handling — needs careful implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 8, 9, 11, 12
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 12, 13, 14, 15
  - **Blocked By**: Tasks 1, 4 (env.ts for FMP_API_KEY)

  **References**:

  **Pattern References**:
  - `src/lib/env.ts` (from Task 4) — Import `serverEnv.FMP_API_KEY`

  **API/Type References**:
  - `src/types/database.ts` (from Task 5) — Trade type to map FMP response to

  **External References**:
  - FMP Senate Trading API: `https://site.financialmodelingprep.com/developer/docs#senate-trading` — Endpoint URL, query params, response shape
  - FMP House Disclosure API: `https://site.financialmodelingprep.com/developer/docs#house-disclosure` — House endpoint specifics
  - FMP Historical Prices: `https://site.financialmodelingprep.com/developer/docs#stock-historical-price` — Historical price endpoint
  - Zod safeParse: `https://zod.dev/?id=safeparse` — Non-throwing validation for partial data

  **WHY Each Reference Matters**:
  - FMP docs define exact response field names (camelCase) that must match Zod schemas
  - SafeParse allows processing valid records even if some FMP records have unexpected shapes

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/fmp` — all tests pass
  - [ ] Client has 5 methods: `fetchSenateTrades`, `fetchSenateTradesByName`, `fetchHouseDisclosures`, `fetchStockQuote`, `fetchHistoricalPrices`
  - [ ] All responses validated through Zod schemas
  - [ ] Retry logic: 3 attempts for 429/5xx with exponential backoff
  - [ ] Invalid FMP records logged as warnings, not thrown

  **QA Scenarios**:

  ```
  Scenario: FMP client tests pass with mocked responses
    Tool: Bash
    Preconditions: Client and tests created
    Steps:
      1. Run `bun test src/lib/fmp 2>&1`
      2. Verify all tests pass
    Expected Result: All tests pass including retry and validation edge cases
    Failure Indicators: Test failures, import errors
    Evidence: .sisyphus/evidence/task-10-fmp-tests.txt

  Scenario: Zod schema rejects malformed FMP data gracefully
    Tool: Bash
    Preconditions: Tests include malformed data test cases
    Steps:
      1. Verify test exists: `grep "malformed\|invalid\|safeParse" src/lib/fmp/__tests__/client.test.ts`
      2. Run `bun test src/lib/fmp --reporter=verbose 2>&1`
      3. Confirm test for invalid data passes
    Expected Result: Malformed records are filtered out, valid records processed
    Failure Indicators: Missing test for invalid data, or test that throws on bad input
    Evidence: .sisyphus/evidence/task-10-zod-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(data): add FMP API client with Zod validation and retry logic`
  - Files: `src/lib/fmp/client.ts`, `src/lib/fmp/schemas.ts`, `src/lib/fmp/__tests__/client.test.ts`
  - Pre-commit: `bun test src/lib/fmp`

- [ ] 11. Politician Name Normalization Utility

  **What to do**:
  - TDD: Write tests first in `src/lib/__tests__/normalize-name.test.ts`
  - Create `src/lib/normalize-name.ts`:
    - `normalizePoliticianName(rawName: string): string` — returns lowercase, trimmed, standardized name
    - Handle FMP inconsistencies:
      - "Pelosi, Nancy" → "nancy pelosi"
      - "PELOSI NANCY" → "nancy pelosi"
      - "Nancy Pelosi" → "nancy pelosi"
      - "Hon. Nancy Pelosi" → "nancy pelosi"
      - Extra whitespace, periods, suffixes (Jr., Sr., III)
    - `parseFirstLast(rawName: string): { firstName: string; lastName: string }` — extract first/last from various formats
  - Test cases should cover at least 10 name formats:
    - "Last, First" format
    - "First Last" format
    - ALL CAPS
    - Honorific prefixes (Hon., Rep., Sen.)
    - Suffixes (Jr., Sr., III, IV)
    - Middle names/initials
    - Double-barreled last names
    - Extra whitespace and periods

  **Must NOT do**:
  - Do NOT use an NLP library for name parsing
  - Do NOT make API calls for name resolution
  - Do NOT handle non-English names specially

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure string utility with clear test cases — no external dependencies
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 8, 9, 10, 12
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - FMP Senate Trading sample response — field names: `firstName`, `lastName` (sometimes inconsistent casing)

  **WHY Each Reference Matters**:
  - Real FMP data shows the inconsistencies that normalization must handle

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/__tests__/normalize-name.test.ts` — 10+ tests pass
  - [ ] Handles "Last, First" and "First Last" formats
  - [ ] Strips honorifics and suffixes
  - [ ] Returns lowercase normalized string
  - [ ] `parseFirstLast` returns correct split for all formats

  **QA Scenarios**:

  ```
  Scenario: Name normalization tests pass
    Tool: Bash
    Preconditions: Utility and tests created
    Steps:
      1. Run `bun test src/lib/__tests__/normalize-name.test.ts --reporter=verbose 2>&1`
      2. Verify 10+ tests pass
    Expected Result: All name format edge cases handled correctly
    Failure Indicators: Any test failure, especially edge cases
    Evidence: .sisyphus/evidence/task-11-name-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(data): add politician name normalization utility`
  - Files: `src/lib/normalize-name.ts`, `src/lib/__tests__/normalize-name.test.ts`
  - Pre-commit: `bun test src/lib/__tests__/normalize-name.test.ts`

- [ ] 12. Stock Price Fetch + Cache Service

  **What to do**:
  - TDD: Write tests first in `src/lib/__tests__/stock-price-service.test.ts`
  - Create `src/lib/stock-price-service.ts`:
    - `getStockQuote(ticker: string): Promise<StockQuote | null>` — fetch current quote from FMP, cache in `stock_prices` table
    - `getHistoricalPrices(ticker: string, from: Date, to: Date): Promise<StockPrice[]>` — fetch from FMP if not cached, store in `stock_prices` table
    - `getCachedQuote(ticker: string): Promise<StockPrice | null>` — check cache first (stale after 1 hour)
    - Cache logic: check `stock_prices` table for today's date → if exists, return cached → if not, fetch from FMP → upsert into table
  - Use Supabase service role client for database operations
  - Handle missing tickers gracefully (return null, don't throw)
  - Handle FMP rate limits (retry is in the FMP client, but this layer should handle null responses)

  **Must NOT do**:
  - Do NOT add WebSocket real-time price streaming
  - Do NOT cache in memory (use database cache only)
  - Do NOT fetch prices for tickers that don't exist (validate ticker first)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple service layer wrapping FMP client with database caching — clear logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 8, 9, 11
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 19, 20
  - **Blocked By**: Tasks 5 (stock_prices table), 10 (FMP client)

  **References**:

  **Pattern References**:
  - `src/lib/fmp/client.ts` (from Task 10) — `fetchStockQuote()` and `fetchHistoricalPrices()` methods
  - `src/types/database.ts` (from Task 5/6) — `StockPrice` type

  **External References**:
  - Supabase upsert: `https://supabase.com/docs/reference/javascript/upsert` — Upsert syntax for cache writes

  **WHY Each Reference Matters**:
  - FMP client provides the fetch methods; this service adds caching layer on top
  - Supabase upsert is needed for "insert if not exists, update if exists" cache pattern

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/__tests__/stock-price-service.test.ts` — all tests pass
  - [ ] Returns cached price if < 1 hour old
  - [ ] Fetches from FMP and caches if no recent cache entry
  - [ ] Returns null for unknown tickers (no throw)
  - [ ] Uses service role client for DB operations

  **QA Scenarios**:

  ```
  Scenario: Stock price service tests pass
    Tool: Bash
    Preconditions: Service and tests created
    Steps:
      1. Run `bun test src/lib/__tests__/stock-price-service.test.ts 2>&1`
      2. Verify all tests pass
    Expected Result: Cache hit, cache miss, and null ticker tests all pass
    Failure Indicators: Test failures, unhandled promise rejections
    Evidence: .sisyphus/evidence/task-12-stock-price-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(data): add stock price service with database caching`
  - Files: `src/lib/stock-price-service.ts`, `src/lib/__tests__/stock-price-service.test.ts`
  - Pre-commit: `bun test src/lib/__tests__/stock-price-service.test.ts`

### Wave 3 — Sync Pipeline + App Shell (After Wave 2)

- [ ] 13. Trade Sync Service (Fetch, Normalize, Dedupe, Upsert)

  **What to do**:
  - TDD: Write tests in `src/lib/sync/__tests__/trade-sync.test.ts`
  - Create `src/lib/sync/trade-sync.ts`:
    - `syncTrades(source: 'senate' | 'house'): Promise<SyncResult>` — main sync function
    - Flow:
      1. Check `sync_runs` for any `status = 'running'` — abort if concurrent run detected
      2. Insert new `sync_runs` row with `status = 'running'`
      3. Fetch trades from FMP (senate or house endpoint)
      4. For each trade:
         a. Normalize politician name via `normalizePoliticianName()`
         b. Find or create politician in `politicians` table (upsert by `normalized_name`)
         c. Parse amount range string: `"$1,001 - $15,000"` → `{ raw: "$1,001 - $15,000", min: 1001, max: 15000 }`
         d. Attempt INSERT into `trades` table — skip on unique constraint violation (dedup)
      5. Update `sync_runs` row: set `status = 'completed'`, fill `trades_fetched`, `trades_inserted`, `trades_skipped`
      6. On error: set `status = 'failed'`, fill `error_message`
  - Create `src/lib/sync/amount-parser.ts`:
    - `parseAmountRange(raw: string): { min: number; max: number }` — parse FMP amount strings
    - Handle known formats: `"$1,001 - $15,000"`, `"$15,001 - $50,000"`, `"$1,000,001 - $5,000,000"`, `"Over $50,000,000"`
  - TDD for amount parser: `src/lib/sync/__tests__/amount-parser.test.ts` with 8+ test cases
  - Use Supabase **service role** client for all DB operations (bypasses RLS)

  **Must NOT do**:
  - Do NOT use pg_cron or Edge Functions
  - Do NOT process more than 1 page of FMP results per sync run (paginate in future iterations)
  - Do NOT send alerts during sync (that's Task 27)
  - Do NOT retry failed individual records — skip and count as `trades_skipped`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core business logic — deduplication, normalization, error handling, concurrent sync prevention — requires careful implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 14, 15, 16
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14, 15, 17, 21, 27
  - **Blocked By**: Tasks 7 (RLS), 8 (auth/service client), 10 (FMP client), 11 (name normalizer)

  **References**:

  **Pattern References**:
  - `src/lib/fmp/client.ts` (Task 10) — `fetchSenateTrades()`, `fetchHouseDisclosures()` methods
  - `src/lib/normalize-name.ts` (Task 11) — `normalizePoliticianName()`, `parseFirstLast()` functions
  - `src/types/database.ts` (Tasks 5/6) — `Trade`, `Politician`, `SyncRun` types

  **API/Type References**:
  - `src/lib/fmp/schemas.ts` (Task 10) — `SenateTrade`, `HouseDisclosure` Zod schemas for FMP response shapes

  **External References**:
  - Supabase upsert: `https://supabase.com/docs/reference/javascript/upsert` — `onConflict` parameter for dedup
  - FMP amount formats: Known values from research — `"$1,001 - $15,000"`, `"$15,001 - $50,000"`, etc.

  **WHY Each Reference Matters**:
  - FMP client provides raw data; this service transforms and persists it
  - Name normalizer ensures politicians are matched correctly across different FMP name formats
  - Supabase upsert with onConflict handles the deduplication strategy

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/sync` — all tests pass (sync + amount parser)
  - [ ] Amount parser handles all known FMP formats (8+ test cases)
  - [ ] Concurrent sync prevention works (second run aborts)
  - [ ] Duplicate trades are skipped (not errored)
  - [ ] `sync_runs` row correctly updated with counts on success and failure

  **QA Scenarios**:

  ```
  Scenario: Trade sync tests pass
    Tool: Bash
    Preconditions: Sync service and tests created
    Steps:
      1. Run `bun test src/lib/sync 2>&1`
      2. Verify all tests pass
    Expected Result: All sync and amount-parser tests pass
    Failure Indicators: Test failures, especially dedup and concurrent sync tests
    Evidence: .sisyphus/evidence/task-13-sync-tests.txt

  Scenario: Amount parser handles all known FMP formats
    Tool: Bash
    Preconditions: Amount parser tests created
    Steps:
      1. Run `bun test src/lib/sync/__tests__/amount-parser.test.ts --reporter=verbose 2>&1`
      2. Verify 8+ tests pass
    Expected Result: All formats parsed correctly
    Failure Indicators: Any format unhandled
    Evidence: .sisyphus/evidence/task-13-amount-parser.txt
  ```

  **Commit**: YES
  - Message: `feat(sync): add trade sync service with normalization, dedup, and amount parsing`
  - Files: `src/lib/sync/trade-sync.ts`, `src/lib/sync/amount-parser.ts`, `src/lib/sync/__tests__/trade-sync.test.ts`, `src/lib/sync/__tests__/amount-parser.test.ts`
  - Pre-commit: `bun test src/lib/sync`

- [ ] 14. Vercel Cron API Route + sync_runs Logging

  **What to do**:
  - Create `src/app/api/cron/sync-trades/route.ts`:
    - POST handler (Vercel Cron sends POST)
    - Verify `CRON_SECRET` header matches env var (security — prevent unauthorized triggers)
    - Call `syncTrades('senate')` then `syncTrades('house')` sequentially
    - Return JSON with sync results: `{ senate: SyncResult, house: SyncResult }`
    - Return 401 if CRON_SECRET doesn't match
    - Return 500 with error details on failure
  - Add `CRON_SECRET` to env schema in `src/lib/env.ts`
  - Add to `vercel.json`:
    ```json
    {
      "crons": [{
        "path": "/api/cron/sync-trades",
        "schedule": "0 */4 * * *"
      }]
    }
    ```
  - TDD: Write tests for:
    - Successful sync returns 200 with results
    - Missing/invalid CRON_SECRET returns 401
    - Sync failure returns 500 with error

  **Must NOT do**:
  - Do NOT use Edge runtime for this route (needs Node.js for longer execution time)
  - Do NOT trigger alerts from this route (alerts are triggered separately in Task 27)
  - Do NOT run senate and house syncs in parallel (sequential to avoid FMP rate limits)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API route with security, error handling, and integration with sync service
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 15, 16 (but depends on 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 27, 29
  - **Blocked By**: Task 13 (sync service must exist)

  **References**:

  **Pattern References**:
  - `src/lib/sync/trade-sync.ts` (Task 13) — `syncTrades()` function to call
  - `src/lib/env.ts` (Task 4) — Add `CRON_SECRET` to server schema

  **External References**:
  - Vercel Cron: `https://vercel.com/docs/cron-jobs` — Cron configuration, CRON_SECRET security pattern
  - Next.js Route Handlers: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` — POST handler in App Router

  **WHY Each Reference Matters**:
  - Vercel Cron docs specify the exact `vercel.json` format and CRON_SECRET header check
  - Route handler docs ensure correct export signature (`export async function POST(request: Request)`)

  **Acceptance Criteria**:

  - [ ] `src/app/api/cron/sync-trades/route.ts` handles POST
  - [ ] Returns 401 for missing/invalid CRON_SECRET
  - [ ] Returns 200 with `{ senate: {...}, house: {...} }` on success
  - [ ] `vercel.json` has cron schedule every 4 hours
  - [ ] `CRON_SECRET` added to env schema

  **QA Scenarios**:

  ```
  Scenario: Cron endpoint rejects unauthorized requests
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/cron/sync-trades`
      2. Check response code is 401
    Expected Result: HTTP 401 Unauthorized
    Failure Indicators: HTTP 200 (no auth check), HTTP 500
    Evidence: .sisyphus/evidence/task-14-cron-unauthorized.txt

  Scenario: Cron route tests pass
    Tool: Bash
    Preconditions: Route and tests created
    Steps:
      1. Run `bun test src/app/api/cron 2>&1`
      2. Verify all tests pass
    Expected Result: All route handler tests pass
    Failure Indicators: Test failures
    Evidence: .sisyphus/evidence/task-14-cron-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(sync): add Vercel Cron API route for automated trade sync`
  - Files: `src/app/api/cron/sync-trades/route.ts`, `vercel.json`, `src/lib/env.ts` (updated), tests
  - Pre-commit: `bun test`

- [ ] 15. Historical Data Backfill Script

  **What to do**:
  - Create `scripts/backfill.ts`:
    - Standalone script runnable via `bun run scripts/backfill.ts`
    - Fetches ALL available senate and house trades from FMP (paginate if needed)
    - Uses same `syncTrades()` logic from Task 13 but with pagination
    - Logs progress to console: "Fetched page N, inserted X trades, skipped Y duplicates"
    - Creates a `sync_runs` entry with source `'backfill'`
    - Handles interruption gracefully — can be re-run safely (dedup prevents duplicates)
  - Add script to `package.json`: `"backfill": "bun run scripts/backfill.ts"`
  - TDD: Write basic test for pagination logic

  **Must NOT do**:
  - Do NOT run backfill automatically on deploy
  - Do NOT backfill stock prices (only trades)
  - Do NOT modify the sync service — use it as-is, just call it multiple times with pagination

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Script with pagination, progress logging, and re-runnable safety — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 14, 16
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 13 (sync service)

  **References**:

  **Pattern References**:
  - `src/lib/sync/trade-sync.ts` (Task 13) — Reuse sync logic with pagination wrapper
  - `src/lib/fmp/client.ts` (Task 10) — Page parameter on fetch methods

  **External References**:
  - FMP pagination: pagination via `page` query parameter on senate-trading endpoint

  **WHY Each Reference Matters**:
  - Backfill reuses the exact same sync logic to ensure consistency — only adds pagination loop

  **Acceptance Criteria**:

  - [ ] `scripts/backfill.ts` exists and is runnable
  - [ ] `package.json` has `"backfill"` script
  - [ ] Script creates a `sync_runs` entry with source `'backfill'`
  - [ ] Safe to re-run (duplicates are skipped)
  - [ ] Logs progress to console

  **QA Scenarios**:

  ```
  Scenario: Backfill script runs without error
    Tool: Bash
    Preconditions: Script created, Supabase and FMP configured
    Steps:
      1. Run `bun run scripts/backfill.ts --dry-run 2>&1` (or just import test)
      2. Check exit code
    Expected Result: Script completes without crash
    Failure Indicators: Unhandled exceptions, missing imports
    Evidence: .sisyphus/evidence/task-15-backfill-run.txt
  ```

  **Commit**: YES
  - Message: `feat(sync): add historical trade backfill script`
  - Files: `scripts/backfill.ts`, `package.json` (updated)
  - Pre-commit: `bun run build`

- [ ] 16. App Shell Layout + Navigation

  **What to do**:
  - Create `src/app/(app)/layout.tsx` — authenticated app layout:
    - Top navigation bar with:
      - App logo/name ("CapitolTrades" or similar — placeholder)
      - Navigation links: Trades, Politicians, Pricing
      - User menu (avatar dropdown): Settings, Billing, Log out
      - Badge showing "Free" or "Premium" plan status
    - Responsive: hamburger menu on mobile
    - Use shadcn Sheet for mobile nav drawer
    - Use shadcn DropdownMenu for user menu
    - Use shadcn Avatar for user avatar (initials-based)
  - Create `src/components/nav/top-nav.tsx` — reusable top navigation component
  - Create `src/components/nav/mobile-nav.tsx` — mobile drawer navigation
  - Create `src/components/nav/user-menu.tsx` — user dropdown with plan badge
  - Legal disclaimer footer: "Not financial advice. Data may be delayed. See disclaimer." with link to `/legal/disclaimer`
  - Use Server Component for layout, fetch user session in layout

  **Must NOT do**:
  - Do NOT add sidebar navigation (top nav only)
  - Do NOT add dark mode toggle
  - Do NOT add notification bell icon
  - Do NOT add search in the nav bar (search is on specific pages)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Primary layout component — visual quality critical for app feel
  - **Skills**: [`frontend-design`]
    - `frontend-design`: App shell sets visual tone — needs polished execution

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 13, 14, 15
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 17-20, 24, 25, 28, 29, 30
  - **Blocked By**: Task 3 (shadcn components)

  **References**:

  **Pattern References**:
  - `src/lib/supabase/server.ts` (Task 8) — Fetch user session in Server Component layout
  - `src/components/ui/` (Task 3) — shadcn Sheet, DropdownMenu, Avatar, Badge components

  **External References**:
  - shadcn Sheet: `https://ui.shadcn.com/docs/components/sheet` — Mobile drawer pattern
  - shadcn DropdownMenu: `https://ui.shadcn.com/docs/components/dropdown-menu` — User menu pattern
  - Next.js layouts: `https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates` — Nested layout pattern

  **WHY Each Reference Matters**:
  - Server Component layout can fetch session without client-side hydration
  - shadcn components ensure consistent, accessible UI primitives
  - Route group `(app)` allows different layout from auth pages

  **Acceptance Criteria**:

  - [ ] `src/app/(app)/layout.tsx` renders top navigation + footer
  - [ ] Navigation shows: Trades, Politicians, Pricing links
  - [ ] User menu shows: Settings, Billing, Log out
  - [ ] Mobile: hamburger button opens Sheet drawer
  - [ ] Legal disclaimer in footer
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: App shell renders with navigation
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user logged in
    Steps:
      1. Navigate to http://localhost:3000/dashboard (or any (app) route)
      2. Assert nav element exists with links: Trades, Politicians, Pricing
      3. Assert user menu dropdown exists
      4. Assert footer contains "Not financial advice"
      5. Screenshot desktop viewport
    Expected Result: Clean nav bar with all links, legal footer visible
    Failure Indicators: Missing nav links, broken layout, no footer
    Evidence: .sisyphus/evidence/task-16-app-shell-desktop.png

  Scenario: Mobile navigation works
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to http://localhost:3000/dashboard
      3. Assert hamburger button is visible
      4. Click hamburger button
      5. Assert Sheet drawer opens with navigation links
      6. Screenshot mobile viewport
    Expected Result: Hamburger button visible, drawer opens with nav links
    Failure Indicators: Nav links visible without hamburger (not responsive), drawer doesn't open
    Evidence: .sisyphus/evidence/task-16-app-shell-mobile.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add app shell layout with responsive navigation`
  - Files: `src/app/(app)/layout.tsx`, `src/components/nav/top-nav.tsx`, `src/components/nav/mobile-nav.tsx`, `src/components/nav/user-menu.tsx`
  - Pre-commit: `bun run build`

### Wave 4 — Core Pages (After Wave 3)

- [ ] 17. Trade Feed Page (Dashboard)

  **What to do**:
  - Create `src/app/(app)/dashboard/page.tsx` — Server Component:
    - Fetch recent trades from Supabase with politician join
    - **Free users**: last 30 days only (filter by `transaction_date >= now() - 30 days`)
    - **Premium users**: all trades (no date filter)
    - Show trades in a shadcn Table:
      - Columns: Date, Politician (name + party badge), Ticker, Type (buy/sell with color), Amount Range, Asset Name
      - Sort by disclosure_date DESC (most recent first)
    - Pagination: 25 trades per page, "Load more" button or page-based
    - If free user viewing older data: show blur/overlay with "Upgrade to Premium" CTA
  - Create `src/components/trades/trade-table.tsx` — reusable trade table component
  - Create `src/components/trades/trade-row.tsx` — individual trade row with:
    - Green text/badge for purchases, red for sales (use `trade-buy`/`trade-sell` colors)
    - Politician name links to `/politicians/{id}`
    - Ticker links to `/stocks/{ticker}`
  - URL state for pagination: `?page=2`

  **Must NOT do**:
  - Do NOT add real-time updates (no WebSocket/Realtime)
  - Do NOT add more than 3 filter options
  - Do NOT add infinite scroll (use "Load more" or page numbers)
  - Do NOT fetch stock prices on this page

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Primary data display page — table layout, color coding, responsive design
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Trade table needs clean, scannable visual design

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 18, 19, 20, 21
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 30, 32
  - **Blocked By**: Tasks 8 (auth), 13 (trades data), 16 (app shell)

  **References**:

  **Pattern References**:
  - `src/lib/supabase/server.ts` (Task 8) — Server-side Supabase client for data fetching
  - `src/types/database.ts` (Tasks 5/6) — `Trade`, `Politician` types
  - `src/app/(app)/layout.tsx` (Task 16) — App shell wraps this page

  **API/Type References**:
  - `src/types/database.ts` — Trade type with `transaction_type`, `amount_range_raw`, `ticker`

  **External References**:
  - shadcn Table: `https://ui.shadcn.com/docs/components/table` — Table component API
  - shadcn Badge: `https://ui.shadcn.com/docs/components/badge` — Party and trade type badges

  **WHY Each Reference Matters**:
  - Server Supabase client enables data fetching in Server Components without client-side hydration
  - shadcn Table ensures consistent, accessible table markup

  **Acceptance Criteria**:

  - [ ] `/dashboard` shows recent trades in a table
  - [ ] Purchases show green, sales show red
  - [ ] Politician names link to politician detail pages
  - [ ] Free users see only 30 days of trades
  - [ ] Pagination works via URL state
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Dashboard displays trade table
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user logged in, trades synced
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Assert table element exists with headers: Date, Politician, Ticker, Type, Amount
      3. Assert at least 1 trade row is visible
      4. Assert a purchase row has green-colored text/badge (class contains "trade-buy" or "green")
      5. Screenshot full page
    Expected Result: Trade table with color-coded rows
    Failure Indicators: Empty table, missing columns, no color coding
    Evidence: .sisyphus/evidence/task-17-dashboard.png

  Scenario: Free user sees only 30 days
    Tool: Playwright (playwright skill)
    Preconditions: Logged in as free user, trades older than 30 days exist
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Check all visible trade dates are within last 30 days
      3. Assert "Upgrade" prompt or overlay is visible (or simply no old data shown)
    Expected Result: No trades older than 30 days shown for free user
    Failure Indicators: Old trades visible to free user
    Evidence: .sisyphus/evidence/task-17-free-limit.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add trade feed dashboard with pagination and plan gating`
  - Files: `src/app/(app)/dashboard/page.tsx`, `src/components/trades/trade-table.tsx`, `src/components/trades/trade-row.tsx`
  - Pre-commit: `bun run build`

- [ ] 18. Politician Directory Page (Search + Filters)

  **What to do**:
  - Create `src/app/(app)/politicians/page.tsx` — Server Component:
    - Fetch all politicians from Supabase with trade count
    - Display as card grid (not table) with:
      - Politician photo (from `image_url` or initials Avatar fallback)
      - Full name, party (colored badge), chamber, state
      - Total trade count
      - Link to `/politicians/{id}`
    - Search: text input that filters by name (URL state: `?q=pelosi`)
    - Filters:
      - Chamber: All / Senate / House (radio or tabs)
      - Party: All / Democrat / Republican / Independent (radio or tabs)
    - Sort: Most trades first (default), alphabetical
  - Create `src/components/politicians/politician-card.tsx` — individual card
  - Use shadcn Tabs or Button group for chamber/party filter
  - URL state for all filters: `?q=pelosi&chamber=Senate&party=Democrat`

  **Must NOT do**:
  - Do NOT add more than 3 filters (search, chamber, party)
  - Do NOT add infinite scroll
  - Do NOT show trade details on this page (just count)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Card grid layout with search and filters — visual quality critical
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Card grid with photos needs polished layout

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 17, 19, 20, 21
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 19, 26, 30, 32
  - **Blocked By**: Tasks 8 (auth), 16 (app shell)

  **References**:

  **Pattern References**:
  - `src/types/database.ts` — `Politician` type with party, chamber, state, image_url
  - `src/app/(app)/layout.tsx` (Task 16) — App shell layout

  **External References**:
  - shadcn Card: `https://ui.shadcn.com/docs/components/card` — Card layout for politician profiles
  - shadcn Tabs: `https://ui.shadcn.com/docs/components/tabs` — Filter tabs for chamber/party
  - unitedstates/images GitHub: `https://github.com/unitedstates/images` — Politician photo URLs

  **WHY Each Reference Matters**:
  - Card component provides consistent layout for politician grid
  - URL state preserves filter selections on back/forward navigation

  **Acceptance Criteria**:

  - [ ] `/politicians` shows grid of politician cards
  - [ ] Search filters cards by name (URL state `?q=`)
  - [ ] Chamber filter works (All / Senate / House)
  - [ ] Party filter works (All / Democrat / Republican / Independent)
  - [ ] Each card links to `/politicians/{id}`
  - [ ] Party badges use correct colors (blue Dem, red Rep, purple Ind)

  **QA Scenarios**:

  ```
  Scenario: Politician directory renders with cards
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, politicians in database
    Steps:
      1. Navigate to http://localhost:3000/politicians
      2. Assert grid of cards is visible (>= 1 card)
      3. Assert each card shows name, party badge, chamber
      4. Assert search input exists
      5. Screenshot page
    Expected Result: Grid of politician cards with metadata
    Failure Indicators: Empty page, no cards, missing metadata
    Evidence: .sisyphus/evidence/task-18-politician-directory.png

  Scenario: Search filters politicians
    Tool: Playwright (playwright skill)
    Preconditions: Multiple politicians in database
    Steps:
      1. Navigate to http://localhost:3000/politicians
      2. Type "pelosi" in search input
      3. Assert URL contains `?q=pelosi`
      4. Assert visible cards contain "Pelosi" in the name
      5. Assert non-matching politicians are hidden
    Expected Result: Only matching politicians shown
    Failure Indicators: All politicians still shown, no URL update
    Evidence: .sisyphus/evidence/task-18-politician-search.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add politician directory with search and party/chamber filters`
  - Files: `src/app/(app)/politicians/page.tsx`, `src/components/politicians/politician-card.tsx`
  - Pre-commit: `bun run build`

- [ ] 19. Politician Detail Page (Trades + Performance Chart)

  **What to do**:
  - Create `src/app/(app)/politicians/[id]/page.tsx` — Server Component:
    - Fetch politician by ID from Supabase
    - Fetch all trades for this politician (with date range gating: 30 days free / all premium)
    - Display politician header:
      - Large photo (or Avatar fallback), name, party, chamber, state
      - "Follow" button (premium only — placeholder, wired in Task 26)
      - Total trade count, most traded stock
    - Trade history table (reuse `trade-table.tsx` from Task 17)
    - Simple performance chart (recharts `LineChart`):
      - X-axis: time, Y-axis: stock price
      - Show only the politician's most-traded ticker price over time
      - Overlay trade markers (buy = green dot, sell = red dot) on the price line
    - If politician not found: 404 page
  - Create `src/components/politicians/politician-header.tsx`
  - Create `src/components/charts/performance-chart.tsx` — recharts LineChart wrapper

  **Must NOT do**:
  - Do NOT add candlestick charts or technical indicators
  - Do NOT add portfolio tracking (aggregate P&L across all trades)
  - Do NOT add backtesting
  - Do NOT show more than ONE chart (most-traded ticker only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex page combining data fetching, premium gating, chart rendering, and trade history — multiple concerns
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Chart + header + table layout needs thoughtful composition

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 17, 18, 20, 21
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 30
  - **Blocked By**: Tasks 8 (auth), 12 (stock prices), 16 (app shell), 18 (politician card patterns)

  **References**:

  **Pattern References**:
  - `src/components/trades/trade-table.tsx` (Task 17) — Reuse trade table component
  - `src/lib/stock-price-service.ts` (Task 12) — Fetch historical prices for chart
  - `src/types/database.ts` — `Politician`, `Trade`, `StockPrice` types

  **External References**:
  - recharts LineChart: `https://recharts.org/en-US/api/LineChart` — LineChart + Line + XAxis + YAxis + Tooltip
  - recharts custom dots: `https://recharts.org/en-US/api/Line#dot` — Custom dot renderer for trade markers

  **WHY Each Reference Matters**:
  - recharts API defines how to compose chart elements and add custom marker dots
  - Trade table reuse ensures visual consistency across dashboard and detail pages

  **Acceptance Criteria**:

  - [ ] `/politicians/{id}` renders politician header with photo, name, party, chamber
  - [ ] Trade history table shows trades (30 days free / all premium)
  - [ ] Performance chart renders with price line and trade markers
  - [ ] 404 page for invalid politician ID
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Politician detail page renders
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, politician with trades exists
    Steps:
      1. Navigate to http://localhost:3000/politicians/{valid-id}
      2. Assert politician name is visible in header
      3. Assert party badge is visible
      4. Assert trade table has at least 1 row
      5. Assert chart element (svg or canvas) is rendered
      6. Screenshot full page
    Expected Result: Complete politician profile with trades and chart
    Failure Indicators: Missing header, empty trades, no chart
    Evidence: .sisyphus/evidence/task-19-politician-detail.png

  Scenario: Invalid politician ID returns 404
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -w "\n%{http_code}" http://localhost:3000/politicians/00000000-0000-0000-0000-000000000000`
      2. Check for 404 status
    Expected Result: HTTP 404
    Failure Indicators: HTTP 500 (unhandled error), HTTP 200 (no validation)
    Evidence: .sisyphus/evidence/task-19-politician-404.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add politician detail page with trades and performance chart`
  - Files: `src/app/(app)/politicians/[id]/page.tsx`, `src/components/politicians/politician-header.tsx`, `src/components/charts/performance-chart.tsx`
  - Pre-commit: `bun run build`

- [ ] 20. Stock Page (Trades for a Ticker)

  **What to do**:
  - Create `src/app/(app)/stocks/[ticker]/page.tsx` — Server Component:
    - Fetch all trades for the given ticker from Supabase
    - Fetch current stock quote via stock price service
    - Display stock header:
      - Ticker symbol, company name (from quote), current price, daily change (green/red)
    - Trade table filtered to this ticker (reuse `trade-table.tsx`)
    - Show which politicians traded this stock and when
    - Premium gating: free users see last 30 days of trades
  - Create `src/components/stocks/stock-header.tsx`
  - Handle unknown ticker: show "No data available" message (not 404)

  **Must NOT do**:
  - Do NOT add a full stock chart (that's on politician detail)
  - Do NOT add company fundamentals or financials
  - Do NOT add a watchlist feature

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Data display page with stock header and trade table — similar pattern to dashboard
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Stock header with price change needs clean visual execution

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 17, 18, 19, 21
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 30, 32
  - **Blocked By**: Tasks 8 (auth), 12 (stock prices), 16 (app shell)

  **References**:

  **Pattern References**:
  - `src/components/trades/trade-table.tsx` (Task 17) — Reuse trade table
  - `src/lib/stock-price-service.ts` (Task 12) — `getStockQuote()` for current price

  **External References**:
  - None additional

  **WHY Each Reference Matters**:
  - Trade table reuse gives consistent UI; stock price service provides header data

  **Acceptance Criteria**:

  - [ ] `/stocks/{ticker}` renders stock header with current price
  - [ ] Trade table shows all politicians who traded this stock
  - [ ] Price change is green for positive, red for negative
  - [ ] Unknown ticker shows "No data available" (not error)
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Stock page renders for known ticker
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, trades with AAPL ticker exist
    Steps:
      1. Navigate to http://localhost:3000/stocks/AAPL
      2. Assert ticker "AAPL" is visible in header
      3. Assert current price is displayed
      4. Assert trade table has at least 1 row
      5. Screenshot page
    Expected Result: Stock header with price + trade table
    Failure Indicators: Empty page, missing price, no trades
    Evidence: .sisyphus/evidence/task-20-stock-page.png

  Scenario: Unknown ticker shows graceful message
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/stocks/ZZZZZ
      2. Assert "No data available" or similar message is visible
      3. Assert page does NOT show error/500
    Expected Result: Graceful empty state
    Failure Indicators: Error page, crash, blank page
    Evidence: .sisyphus/evidence/task-20-stock-unknown.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add stock page with trade history by ticker`
  - Files: `src/app/(app)/stocks/[ticker]/page.tsx`, `src/components/stocks/stock-header.tsx`
  - Pre-commit: `bun run build`

- [ ] 21. CSV Data Export API

  **What to do**:
  - TDD: Write tests in `src/app/api/export/__tests__/route.test.ts`
  - Create `src/app/api/export/trades/route.ts`:
    - GET handler — returns CSV file download
    - Requires authentication (check session)
    - Requires premium subscription (check `profiles.is_premium`)
    - Return 401 for unauthenticated, 403 for non-premium
    - Query params: `?politician_id={id}` (optional), `?ticker={ticker}` (optional), `?from={date}&to={date}` (optional)
    - CSV columns: Date, Politician, Party, Chamber, Ticker, Asset, Type, Amount Range
    - Set headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="trades-export.csv"`
    - Limit to 10,000 rows per export
  - Use Supabase server client to fetch trades with joins

  **Must NOT do**:
  - Do NOT use a CSV library — manual CSV generation (simple format)
  - Do NOT allow export without premium subscription
  - Do NOT allow export of all data at once (10K row limit)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple API route — fetch data, format as CSV, return with headers
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 17, 18, 19, 20
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 8 (auth), 13 (trades in DB)

  **References**:

  **Pattern References**:
  - `src/lib/supabase/server.ts` (Task 8) — Server Supabase client
  - `src/types/database.ts` — Trade type for CSV column mapping

  **External References**:
  - Next.js Route Handlers: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` — Returning custom Response with headers

  **WHY Each Reference Matters**:
  - Route handler docs show how to return a custom Response with CSV content-type and disposition headers

  **Acceptance Criteria**:

  - [ ] GET `/api/export/trades` returns 401 for unauthenticated
  - [ ] GET `/api/export/trades` returns 403 for free users
  - [ ] GET `/api/export/trades` returns CSV file for premium users
  - [ ] CSV has correct headers and data rows
  - [ ] `Content-Disposition` triggers file download

  **QA Scenarios**:

  ```
  Scenario: Export returns 403 for free user
    Tool: Bash (curl)
    Preconditions: Dev server running, free user session cookie available
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -b "session_cookie" http://localhost:3000/api/export/trades`
      2. Check status is 403
    Expected Result: HTTP 403 Forbidden
    Failure Indicators: HTTP 200 (no premium check), HTTP 500
    Evidence: .sisyphus/evidence/task-21-export-forbidden.txt

  Scenario: Export returns CSV for premium user
    Tool: Bash (curl)
    Preconditions: Dev server running, premium user session
    Steps:
      1. Run `curl -s -D - -b "premium_cookie" "http://localhost:3000/api/export/trades?ticker=AAPL"`
      2. Check `Content-Type: text/csv` in headers
      3. Check `Content-Disposition` contains `filename`
      4. Check body starts with CSV header row
    Expected Result: Valid CSV with headers and data
    Failure Indicators: Wrong content type, empty body, HTML error page
    Evidence: .sisyphus/evidence/task-21-export-csv.txt
  ```

  **Commit**: YES
  - Message: `feat(data): add CSV trade data export API (premium only)`
  - Files: `src/app/api/export/trades/route.ts`, tests
  - Pre-commit: `bun test`

### Wave 5 — Payments (After Wave 4)

- [ ] 22. Stripe Checkout + Webhook Handler

  **What to do**:
  - TDD: Write tests in `src/lib/stripe/__tests__/stripe.test.ts`
  - Create `src/lib/stripe/client.ts`:
    - Server-side Stripe instance: `new Stripe(serverEnv.STRIPE_SECRET_KEY)`
    - `createCheckoutSession(userId: string, priceId: string): Promise<string>` — returns checkout URL
    - Uses Stripe Embedded Checkout (redirect mode)
    - Success URL: `/settings/billing?success=true`
    - Cancel URL: `/pricing`
    - Passes `client_reference_id: userId` and `customer_email` from profile
  - Create `src/app/api/stripe/checkout/route.ts`:
    - POST handler — creates checkout session, returns `{ url: string }`
    - Requires authentication
    - If user already has active subscription, return 400
  - Create `src/app/api/stripe/webhook/route.ts`:
    - POST handler — receives Stripe webhook events
    - **CRITICAL**: Use `request.text()` NOT `request.json()` for body (signature verification requires raw body)
    - Verify signature with `stripe.webhooks.constructEvent(body, sig, webhookSecret)`
    - Handle events:
      - `checkout.session.completed`: Create/update subscription, set `profiles.is_premium = true`, set `profiles.stripe_customer_id`
      - `customer.subscription.updated`: Update subscription status
      - `customer.subscription.deleted`: Set `profiles.is_premium = false`, update subscription status to `canceled`
      - `invoice.payment_failed`: Set subscription status to `past_due`
    - Return 200 for all events (even unhandled ones)
    - Idempotency: Check if subscription already exists before creating
  - Add `STRIPE_PRICE_ID` to env schema (the single premium price ID)

  **Must NOT do**:
  - Do NOT use `request.json()` in webhook (breaks signature verification)
  - Do NOT add multiple plans/tiers — one price only ($9.99/mo)
  - Do NOT add annual billing
  - Do NOT add coupon/discount support
  - Do NOT use Stripe Elements (use Checkout redirect)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Payment integration — security-critical webhook signature verification, idempotent event handling, state management
  - **Skills**: [`stripe-payments`]
    - `stripe-payments`: Comprehensive Stripe integration guidance for webhook patterns and Checkout setup

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 23, 24, 25 (but 23-25 depend on 22)
  - **Parallel Group**: Wave 5 — this runs first, then 23-25 in parallel
  - **Blocks**: Tasks 23, 24, 25
  - **Blocked By**: Tasks 4 (env), 7 (RLS), 8 (auth)

  **References**:

  **Pattern References**:
  - `src/lib/env.ts` (Task 4) — `serverEnv.STRIPE_SECRET_KEY`, `serverEnv.STRIPE_WEBHOOK_SECRET`
  - `src/lib/supabase/server.ts` (Task 8) — Server client for updating profiles/subscriptions

  **API/Type References**:
  - `src/types/database.ts` — `Subscription`, `Profile` types

  **External References**:
  - Stripe Checkout: `https://docs.stripe.com/checkout/quickstart` — Checkout session creation
  - Stripe Webhooks: `https://docs.stripe.com/webhooks/quickstart` — Webhook handler pattern
  - Stripe Webhook signature: `https://docs.stripe.com/webhooks/signatures` — Raw body requirement for verification
  - Next.js route handler body: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers#request-body` — `request.text()` for raw body

  **WHY Each Reference Matters**:
  - Webhook signature docs explain why `request.text()` is mandatory (JSON parsing invalidates signature)
  - Checkout docs specify exact parameters for session creation
  - Idempotency is critical — Stripe may send duplicate events

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/stripe` — all tests pass
  - [ ] POST `/api/stripe/checkout` creates Checkout session and returns URL
  - [ ] Webhook handler uses `request.text()` for signature verification
  - [ ] `checkout.session.completed` sets `is_premium = true` and creates subscription
  - [ ] `customer.subscription.deleted` sets `is_premium = false`
  - [ ] Webhook returns 200 for all events
  - [ ] Already-subscribed user gets 400 on checkout attempt

  **QA Scenarios**:

  ```
  Scenario: Checkout endpoint requires auth
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/stripe/checkout`
      2. Check status is 401
    Expected Result: HTTP 401
    Failure Indicators: HTTP 200 or 500
    Evidence: .sisyphus/evidence/task-22-checkout-auth.txt

  Scenario: Webhook rejects invalid signature
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -X POST -H "stripe-signature: invalid" -d '{}' http://localhost:3000/api/stripe/webhook`
      2. Check status is 400
    Expected Result: HTTP 400 (invalid signature)
    Failure Indicators: HTTP 200 (no verification), HTTP 500
    Evidence: .sisyphus/evidence/task-22-webhook-sig.txt

  Scenario: Stripe integration tests pass
    Tool: Bash
    Preconditions: Tests created with mocked Stripe
    Steps:
      1. Run `bun test src/lib/stripe 2>&1`
      2. Verify all tests pass
    Expected Result: All tests pass including webhook event handlers
    Failure Indicators: Test failures
    Evidence: .sisyphus/evidence/task-22-stripe-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(stripe): add Stripe Checkout and webhook handler with subscription sync`
  - Files: `src/lib/stripe/client.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/lib/env.ts` (updated), tests
  - Pre-commit: `bun test`

- [ ] 23. Subscription Sync + Feature Gating Middleware

  **What to do**:
  - Create `src/lib/stripe/subscription-sync.ts`:
    - `syncSubscriptionFromStripe(stripeSubscriptionId: string): Promise<void>` — fetches subscription from Stripe, upserts into subscriptions table, updates `profiles.is_premium`
    - `isUserPremium(userId: string): Promise<boolean>` — checks `profiles.is_premium` field
    - Called from webhook handler (Task 22) after relevant events
  - Create `src/lib/auth/feature-gate.ts`:
    - `requirePremium(userId: string): Promise<void>` — throws 403 if not premium
    - `getTradesDateFilter(userId: string): { from: Date } | null` — returns 30-day filter for free users, null for premium
    - Used in API routes and Server Components for conditional data fetching
  - TDD: Tests for premium check, date filter logic, edge cases (expired sub, past_due)

  **Must NOT do**:
  - Do NOT gate at RLS level (gate at application layer)
  - Do NOT check Stripe API on every request (use cached `is_premium` flag)
  - Do NOT add multiple plan tiers

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Business logic for subscription state management and feature gating — needs careful edge case handling
  - **Skills**: [`stripe-payments`]
    - `stripe-payments`: Subscription lifecycle patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 22
  - **Parallel Group**: Wave 5 — after Task 22, parallel with Tasks 24, 25
  - **Blocks**: Tasks 24, 25, 26, 27
  - **Blocked By**: Task 22

  **References**:

  **Pattern References**:
  - `src/lib/stripe/client.ts` (Task 22) — Stripe instance for fetching subscription details
  - `src/types/database.ts` — `Subscription`, `Profile` types

  **External References**:
  - Stripe subscription statuses: `https://docs.stripe.com/billing/subscriptions/overview#subscription-statuses` — Lifecycle states

  **WHY Each Reference Matters**:
  - Subscription statuses determine is_premium flag (only `active` and `trialing` = premium)

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/stripe` — all tests pass
  - [ ] `isUserPremium()` checks `profiles.is_premium` flag
  - [ ] `getTradesDateFilter()` returns 30-day filter for free, null for premium
  - [ ] `requirePremium()` throws 403 for free users
  - [ ] Edge cases: expired sub returns false, past_due returns true (grace period)

  **QA Scenarios**:

  ```
  Scenario: Feature gating tests pass
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Run `bun test src/lib/stripe src/lib/auth 2>&1`
      2. Verify all tests pass
    Expected Result: All premium check and date filter tests pass
    Failure Indicators: Test failures
    Evidence: .sisyphus/evidence/task-23-feature-gate-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(stripe): add subscription sync and feature gating utilities`
  - Files: `src/lib/stripe/subscription-sync.ts`, `src/lib/auth/feature-gate.ts`, tests
  - Pre-commit: `bun test`

- [ ] 24. Pricing Page + Checkout Integration

  **What to do**:
  - Create `src/app/(app)/pricing/page.tsx` (also accessible without auth):
    - Two-column layout: Free vs Premium comparison
    - Free tier:
      - Last 30 days of trades
      - Basic politician search
      - Public trade data
      - "Current Plan" button (if logged in as free) or "Get Started" (if not logged in)
    - Premium tier ($9.99/mo):
      - Full trade history
      - Email alerts for followed politicians
      - CSV data export
      - Performance charts
      - "Upgrade Now" button → calls `/api/stripe/checkout` → redirects to Stripe
    - If already premium: show "Current Plan" on premium, "Manage Billing" link
    - Success state: if `?success=true` in URL, show "Welcome to Premium!" toast
  - Use shadcn Card for plan cards, Badge for "Popular" on premium
  - Clean, compelling design — this is a revenue page

  **Must NOT do**:
  - Do NOT add annual billing toggle
  - Do NOT add enterprise tier
  - Do NOT add feature comparison table (just two cards)
  - Do NOT add money-back guarantee messaging

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Revenue-critical page — visual quality and CTA clarity directly impact conversion
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Pricing page design needs persuasive, clean execution

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 23, 25
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 16 (app shell), 23 (feature gating to check current plan)

  **References**:

  **Pattern References**:
  - `src/lib/stripe/client.ts` (Task 22) — `createCheckoutSession()` called from checkout API
  - `src/lib/auth/feature-gate.ts` (Task 23) — `isUserPremium()` to determine button state
  - `src/app/(app)/layout.tsx` (Task 16) — App shell layout

  **External References**:
  - shadcn Card: `https://ui.shadcn.com/docs/components/card` — Plan card layout

  **WHY Each Reference Matters**:
  - Feature gate determines whether to show "Upgrade" or "Current Plan" button
  - Checkout client provides the redirect URL for the upgrade CTA

  **Acceptance Criteria**:

  - [ ] `/pricing` renders two plan cards (Free and Premium)
  - [ ] Premium card shows $9.99/mo price
  - [ ] "Upgrade Now" button initiates Stripe checkout (calls API, redirects)
  - [ ] Already-premium user sees "Current Plan" on premium card
  - [ ] `?success=true` shows success toast
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Pricing page renders with two plans
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/pricing
      2. Assert two card elements are visible
      3. Assert "Free" text is in first card
      4. Assert "$9.99" text is in second card
      5. Assert "Upgrade Now" or similar CTA button exists
      6. Screenshot page
    Expected Result: Clean pricing page with two plan cards
    Failure Indicators: Missing cards, wrong price, no CTA
    Evidence: .sisyphus/evidence/task-24-pricing-page.png

  Scenario: Upgrade button triggers checkout
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in as free user
    Steps:
      1. Navigate to http://localhost:3000/pricing
      2. Click "Upgrade Now" button
      3. Assert redirect to Stripe checkout URL (or check network request to /api/stripe/checkout)
    Expected Result: Redirected to Stripe Checkout
    Failure Indicators: No redirect, error message, 401
    Evidence: .sisyphus/evidence/task-24-checkout-redirect.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add pricing page with Stripe checkout integration`
  - Files: `src/app/(app)/pricing/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 25. Billing Settings + Customer Portal

  **What to do**:
  - Create `src/app/(app)/settings/billing/page.tsx`:
    - Show current plan status (Free or Premium)
    - If premium: show subscription details (next billing date, price)
    - "Manage Subscription" button → redirects to Stripe Customer Portal
    - If free: "Upgrade to Premium" CTA linking to `/pricing`
    - Cancel subscription: "Cancel" button → confirmation dialog → Stripe Customer Portal
  - Create `src/app/api/stripe/portal/route.ts`:
    - POST handler — creates Stripe billing portal session
    - Requires auth, requires `stripe_customer_id` on profile
    - Returns `{ url: string }` for redirect
  - Configure Stripe Customer Portal in Stripe Dashboard (manual step — document in task)

  **Must NOT do**:
  - Do NOT build custom cancellation flow (use Stripe Customer Portal)
  - Do NOT show invoice history (Stripe Portal handles this)
  - Do NOT add plan switching (only one plan)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Settings page with subscription details and portal integration
  - **Skills**: [`stripe-payments`]
    - `stripe-payments`: Customer Portal integration patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 23, 24
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 16 (app shell), 23 (subscription sync for current plan status)

  **References**:

  **Pattern References**:
  - `src/lib/stripe/client.ts` (Task 22) — Stripe instance for portal session creation
  - `src/lib/auth/feature-gate.ts` (Task 23) — Check premium status for display

  **External References**:
  - Stripe Customer Portal: `https://docs.stripe.com/customer-management/get-started` — Portal session creation
  - Stripe billing portal session API: `https://docs.stripe.com/api/customer_portal/sessions/create` — API for creating portal URL

  **WHY Each Reference Matters**:
  - Customer Portal eliminates need to build subscription management UI (cancellation, payment method update, invoice history)

  **Acceptance Criteria**:

  - [ ] `/settings/billing` shows current plan status
  - [ ] Premium users see subscription details and "Manage Subscription" button
  - [ ] "Manage Subscription" redirects to Stripe Customer Portal
  - [ ] Free users see "Upgrade to Premium" CTA
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Billing page shows plan status
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in user
    Steps:
      1. Navigate to http://localhost:3000/settings/billing
      2. Assert plan status text is visible ("Free Plan" or "Premium Plan")
      3. Assert appropriate CTA exists (Upgrade for free, Manage for premium)
      4. Screenshot page
    Expected Result: Clear plan status with correct CTA
    Failure Indicators: No plan status, wrong CTA
    Evidence: .sisyphus/evidence/task-25-billing-page.png
  ```

  **Commit**: YES
  - Message: `feat(stripe): add billing settings page with Customer Portal integration`
  - Files: `src/app/(app)/settings/billing/page.tsx`, `src/app/api/stripe/portal/route.ts`
  - Pre-commit: `bun run build`

### Wave 6 — Alerts + Polish (After Wave 5)

- [ ] 26. Follow/Unfollow Politician API + Alerts Settings Page

  **What to do**:
  - TDD: Write tests in `src/app/api/follow/__tests__/route.test.ts`
  - Create `src/app/api/follow/route.ts`:
    - POST handler: `{ politician_id: string }` → insert into `followed_politicians`
    - DELETE handler: `{ politician_id: string }` → delete from `followed_politicians`
    - Requires auth + premium subscription (free users get 403)
    - Return 409 if already following (POST), 404 if not following (DELETE)
  - Create `src/app/api/follow/list/route.ts`:
    - GET handler — returns list of followed politicians for current user
    - Requires auth (any user can see their follows, but only premium can modify)
  - Create `src/app/(app)/settings/alerts/page.tsx`:
    - List of followed politicians with "Unfollow" button next to each
    - Search to add new politicians to follow (reuse search from politician directory)
    - Show "Premium required" message if user is free tier
    - If no follows: empty state with CTA to browse politicians
  - Wire "Follow" button on politician detail page (Task 19): call POST `/api/follow`

  **Must NOT do**:
  - Do NOT allow free users to follow politicians (premium only)
  - Do NOT add notification preferences (follow = auto-alert, always)
  - Do NOT add push notifications or SMS

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API endpoints + settings page + wiring to existing politician detail — crosses multiple files and concerns
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Alerts settings page needs clean UX for managing follows

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 27, 28, 29, 30, 31
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 27
  - **Blocked By**: Tasks 8 (auth), 18 (politician directory for search), 23 (premium check)

  **References**:

  **Pattern References**:
  - `src/lib/auth/feature-gate.ts` (Task 23) — `requirePremium()` for endpoint protection
  - `src/types/database.ts` — `FollowedPolitician` type
  - `src/components/politicians/politician-card.tsx` (Task 18) — Reuse for follow list display

  **External References**:
  - Supabase insert/delete: `https://supabase.com/docs/reference/javascript/insert` — Insert and delete operations

  **WHY Each Reference Matters**:
  - Feature gate ensures only premium users can follow
  - Politician card reuse provides consistent visual in alerts settings

  **Acceptance Criteria**:

  - [ ] POST `/api/follow` adds politician to follows (premium only)
  - [ ] DELETE `/api/follow` removes politician from follows
  - [ ] Free user gets 403 on follow attempt
  - [ ] `/settings/alerts` shows followed politicians list
  - [ ] "Follow" button works on politician detail page
  - [ ] `bun test` passes

  **QA Scenarios**:

  ```
  Scenario: Free user cannot follow
    Tool: Bash (curl)
    Preconditions: Dev server running, free user session
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -X POST -b "free_cookie" -H "Content-Type: application/json" -d '{"politician_id":"some-id"}' http://localhost:3000/api/follow`
      2. Check status is 403
    Expected Result: HTTP 403 Forbidden
    Failure Indicators: HTTP 200 (no premium check)
    Evidence: .sisyphus/evidence/task-26-follow-free.txt

  Scenario: Alerts settings page renders
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, premium user logged in with follows
    Steps:
      1. Navigate to http://localhost:3000/settings/alerts
      2. Assert at least one followed politician is listed
      3. Assert "Unfollow" button exists for each
      4. Screenshot page
    Expected Result: List of followed politicians with unfollow buttons
    Failure Indicators: Empty page, missing buttons, 403 error
    Evidence: .sisyphus/evidence/task-26-alerts-settings.png
  ```

  **Commit**: YES
  - Message: `feat(alerts): add follow/unfollow API and alerts settings page`
  - Files: `src/app/api/follow/route.ts`, `src/app/api/follow/list/route.ts`, `src/app/(app)/settings/alerts/page.tsx`, tests
  - Pre-commit: `bun test`

- [ ] 27. Alert Email Sending via Resend (Triggered During Sync)

  **What to do**:
  - TDD: Write tests in `src/lib/alerts/__tests__/alert-service.test.ts`
  - Create `src/lib/alerts/alert-service.ts`:
    - `sendTradeAlerts(newTrades: Trade[]): Promise<{ sent: number; failed: number }>` — main alert function
    - Flow:
      1. For each new trade inserted during sync, find politician_id
      2. Query `followed_politicians` to find all premium users following that politician
      3. Batch users by politician to avoid duplicate logic
      4. For each user: compose and send email via Resend
      5. Return count of sent and failed emails
  - Create `src/lib/alerts/email-templates.ts`:
    - `composeTradeAlertEmail(user: Profile, politician: Politician, trade: Trade): { subject: string; html: string }` — compose email content
    - Subject: "{Politician Name} just made a {buy/sell} trade"
    - HTML body: Clean, simple email with trade details, link to politician page
    - No heavy email template library — just template literals
  - Integrate into sync pipeline: Call `sendTradeAlerts(insertedTrades)` at end of `syncTrades()` in Task 13's flow (modify trade-sync.ts to accept a callback or call directly)
  - Use Resend SDK: `new Resend(serverEnv.RESEND_API_KEY)` → `resend.emails.send()`

  **Must NOT do**:
  - Do NOT send alerts to free users (premium only)
  - Do NOT send more than one email per trade per user
  - Do NOT use a heavy email template library (React Email, MJML, etc.)
  - Do NOT add email preferences — following = always receive alerts
  - Do NOT queue emails (send inline during sync — volume is low)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Alert pipeline crossing sync service, user follows, and email sending — multiple system boundaries
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 28, 29, 30, 31
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: Tasks 13 (sync service), 14 (cron route), 23 (premium check), 26 (follows)

  **References**:

  **Pattern References**:
  - `src/lib/sync/trade-sync.ts` (Task 13) — Integration point for sending alerts after sync
  - `src/lib/auth/feature-gate.ts` (Task 23) — Premium check for alert recipients
  - `src/types/database.ts` — `Trade`, `Politician`, `Profile`, `FollowedPolitician` types

  **External References**:
  - Resend SDK: `https://resend.com/docs/send-with-nextjs` — Email sending in Next.js
  - Resend API: `https://resend.com/docs/api-reference/emails/send-email` — Send email parameters

  **WHY Each Reference Matters**:
  - Resend docs specify exact SDK usage and rate limits (free tier: 3K/month)
  - Sync service integration point determines when alerts fire (after successful trade inserts)

  **Acceptance Criteria**:

  - [ ] `bun test src/lib/alerts` — all tests pass
  - [ ] `sendTradeAlerts()` sends emails only to premium followers
  - [ ] Email subject contains politician name and trade type
  - [ ] Email body includes trade details and link to politician page
  - [ ] No duplicate emails per trade per user

  **QA Scenarios**:

  ```
  Scenario: Alert service tests pass
    Tool: Bash
    Preconditions: Alert service and tests created
    Steps:
      1. Run `bun test src/lib/alerts 2>&1`
      2. Verify all tests pass (mocked Resend)
    Expected Result: All alert tests pass
    Failure Indicators: Test failures, unmocked API calls
    Evidence: .sisyphus/evidence/task-27-alert-tests.txt

  Scenario: Email template generates valid HTML
    Tool: Bash
    Preconditions: Email template function created
    Steps:
      1. Write a quick script or test that calls `composeTradeAlertEmail()` with mock data
      2. Verify output contains subject string and HTML with trade details
      3. Verify HTML contains link to politician page
    Expected Result: Valid subject and HTML with all trade info
    Failure Indicators: Missing fields, broken HTML, no link
    Evidence: .sisyphus/evidence/task-27-email-template.txt
  ```

  **Commit**: YES
  - Message: `feat(alerts): add email alert system via Resend for followed politicians`
  - Files: `src/lib/alerts/alert-service.ts`, `src/lib/alerts/email-templates.ts`, `src/lib/sync/trade-sync.ts` (updated), tests
  - Pre-commit: `bun test`

- [ ] 28. Landing / Marketing Page

  **What to do**:
  - Create `src/app/(marketing)/layout.tsx` — marketing layout (different from app layout):
    - Simpler nav: logo + "Log in" + "Sign up" buttons
    - No user menu or authenticated nav
  - Create `src/app/(marketing)/page.tsx` — landing page (replaces default Next.js page):
    - Hero section: headline about tracking congressional trades, subtitle about data transparency
    - "Get Started Free" CTA button → `/signup`
    - Features section: 3-4 cards showing key features (trade tracking, search, alerts, export)
    - Social proof section: "Track trades from 535+ members of Congress" (or similar stat)
    - Pricing preview: link to `/pricing`
    - Legal disclaimer in footer
  - Clean, modern design — white/light gray background, minimal imagery
  - Responsive (mobile-first)

  **Must NOT do**:
  - Do NOT add a blog
  - Do NOT add testimonials (no users yet)
  - Do NOT add animated hero or complex illustrations
  - Do NOT add a newsletter signup form
  - Do NOT use stock photos

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Marketing/landing page — visual quality is the primary success metric
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Landing page needs compelling, distinctive design

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 26, 27, 29, 30, 31
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: Task 16 (shared design tokens/components)

  **References**:

  **Pattern References**:
  - `src/components/ui/` (Task 3) — shadcn Button, Card for feature cards

  **External References**:
  - QuiverQuant homepage: `https://www.quiverquant.com/` — Competitor reference for messaging (do NOT copy design)

  **WHY Each Reference Matters**:
  - QuiverQuant shows what messaging resonates in this space (transparency, data access, accountability)

  **Acceptance Criteria**:

  - [ ] `/` renders landing page (not default Next.js page)
  - [ ] Hero section with headline and "Get Started Free" CTA
  - [ ] Features section with 3-4 cards
  - [ ] CTA buttons link to `/signup`
  - [ ] Legal disclaimer in footer
  - [ ] Responsive on mobile (375px)

  **QA Scenarios**:

  ```
  Scenario: Landing page renders with all sections
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/
      2. Assert hero heading element exists
      3. Assert "Get Started" or "Sign Up" CTA button exists
      4. Assert features section with 3+ cards
      5. Assert footer with legal disclaimer
      6. Screenshot full page (desktop)
      7. Set viewport to 375x812 and screenshot (mobile)
    Expected Result: Complete landing page with all sections, responsive
    Failure Indicators: Missing sections, broken layout, default Next.js page
    Evidence: .sisyphus/evidence/task-28-landing-desktop.png, .sisyphus/evidence/task-28-landing-mobile.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add landing/marketing page with hero, features, and CTA`
  - Files: `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 29. Admin Sync Status Dashboard

  **What to do**:
  - Create `src/app/(app)/admin/page.tsx`:
    - Protected: only accessible if `profiles.is_admin = true`
    - Show recent `sync_runs` in a table:
      - Columns: Started At, Source, Status (badge: green/red/yellow), Trades Fetched, Inserted, Skipped, Duration, Error
    - "Trigger Sync Now" button → calls POST `/api/cron/sync-trades` with CRON_SECRET
    - Show last successful sync timestamp prominently
    - Show database stats: total politicians, total trades, total users, total premium users
  - Create `src/app/api/admin/stats/route.ts`:
    - GET handler — returns aggregated stats
    - Requires auth + is_admin check
  - Admin check middleware: verify `profiles.is_admin` before rendering

  **Must NOT do**:
  - Do NOT add CRUD for politicians or trades (data is API-sourced only)
  - Do NOT add user management
  - Do NOT add a complex admin framework (just one page)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Admin page with stats aggregation, sync trigger, and auth gating — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 26, 27, 28, 30, 31
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: Tasks 14 (cron route for manual trigger), 16 (app shell)

  **References**:

  **Pattern References**:
  - `src/types/database.ts` — `SyncRun` type for table display
  - `src/app/api/cron/sync-trades/route.ts` (Task 14) — Endpoint to trigger manual sync

  **External References**:
  - shadcn Table: `https://ui.shadcn.com/docs/components/table` — Table for sync runs

  **WHY Each Reference Matters**:
  - Sync runs table provides operational visibility into data pipeline health

  **Acceptance Criteria**:

  - [ ] `/admin` shows sync runs table and database stats
  - [ ] Non-admin users are redirected or see 403
  - [ ] "Trigger Sync Now" button works
  - [ ] Stats show: total politicians, trades, users, premium users
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Non-admin user cannot access admin page
    Tool: Bash (curl)
    Preconditions: Dev server running, regular user session
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -b "regular_cookie" http://localhost:3000/admin`
      2. Check for redirect to /dashboard or 403 status
    Expected Result: Redirect or 403 (not 200)
    Failure Indicators: HTTP 200 with admin content
    Evidence: .sisyphus/evidence/task-29-admin-denied.txt

  Scenario: Admin page renders with sync data
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, admin user logged in, sync has run
    Steps:
      1. Navigate to http://localhost:3000/admin
      2. Assert sync runs table is visible
      3. Assert "Trigger Sync Now" button exists
      4. Assert stats section shows numbers
      5. Screenshot page
    Expected Result: Admin dashboard with sync data and stats
    Failure Indicators: Empty tables, missing stats
    Evidence: .sisyphus/evidence/task-29-admin-page.png
  ```

  **Commit**: YES
  - Message: `feat(admin): add sync status dashboard with manual trigger`
  - Files: `src/app/(app)/admin/page.tsx`, `src/app/api/admin/stats/route.ts`
  - Pre-commit: `bun run build`

- [ ] 30. Loading States, Error Boundaries, Empty States

  **What to do**:
  - Add `loading.tsx` files for key routes:
    - `src/app/(app)/dashboard/loading.tsx` — Skeleton table rows
    - `src/app/(app)/politicians/loading.tsx` — Skeleton cards grid
    - `src/app/(app)/politicians/[id]/loading.tsx` — Skeleton header + table
    - `src/app/(app)/stocks/[ticker]/loading.tsx` — Skeleton header + table
  - Create `src/app/(app)/error.tsx` — Global error boundary:
    - "Something went wrong" message
    - "Try again" button (calls `reset()`)
    - Report error to console (no external error tracking for MVP)
  - Create `src/app/not-found.tsx` — Custom 404 page
  - Add empty states to:
    - Trade feed: "No trades found" with helpful message
    - Politician directory: "No politicians match your search"
    - Alerts settings: "You're not following any politicians yet. Browse politicians →"
  - Use shadcn Skeleton component for loading states

  **Must NOT do**:
  - Do NOT add external error tracking (Sentry, etc.)
  - Do NOT add complex error recovery (just "try again")
  - Do NOT add loading spinners (use skeleton screens)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UX polish — loading skeletons, error pages, empty states define perceived quality
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Empty states and error pages need thoughtful microcopy and layout

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 26, 27, 28, 29, 31
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: Tasks 16-20 (pages must exist to add loading/error states)

  **References**:

  **Pattern References**:
  - All page files from Tasks 17-20 — loading.tsx mirrors the page structure with Skeleton
  - `src/components/ui/skeleton.tsx` (Task 3) — shadcn Skeleton component

  **External References**:
  - Next.js loading UI: `https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming` — loading.tsx convention
  - Next.js error handling: `https://nextjs.org/docs/app/building-your-application/routing/error-handling` — error.tsx convention
  - shadcn Skeleton: `https://ui.shadcn.com/docs/components/skeleton` — Skeleton component API

  **WHY Each Reference Matters**:
  - Next.js conventions for loading.tsx and error.tsx ensure correct Suspense boundary behavior
  - Skeleton component provides consistent loading appearance

  **Acceptance Criteria**:

  - [ ] Loading states show skeleton screens (not spinners)
  - [ ] Error boundary catches and displays errors with "Try again"
  - [ ] Custom 404 page renders
  - [ ] Empty states have helpful messages and CTAs
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Custom 404 page renders
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/this-page-does-not-exist
      2. Assert "not found" or "404" text is visible
      3. Assert link to home page exists
      4. Screenshot page
    Expected Result: Custom 404 page (not default Next.js 404)
    Failure Indicators: Default Next.js 404, blank page
    Evidence: .sisyphus/evidence/task-30-404.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add loading skeletons, error boundaries, and empty states`
  - Files: `src/app/(app)/dashboard/loading.tsx`, `src/app/(app)/politicians/loading.tsx`, `src/app/(app)/politicians/[id]/loading.tsx`, `src/app/(app)/stocks/[ticker]/loading.tsx`, `src/app/(app)/error.tsx`, `src/app/not-found.tsx`
  - Pre-commit: `bun run build`

- [ ] 31. SEO Metadata + Legal Pages

  **What to do**:
  - Add metadata to all pages via Next.js `metadata` export:
    - Landing: `title: "CapitolTrades — Track Congressional Stock Trades"`, description, OpenGraph
    - Politicians: `title: "Politicians | CapitolTrades"`, description
    - Politician detail: dynamic `title: "{Name} | CapitolTrades"` via `generateMetadata()`
    - Stock page: dynamic `title: "{TICKER} — Congressional Trades | CapitolTrades"`
    - Pricing: `title: "Pricing | CapitolTrades"`
  - Create `src/app/(marketing)/legal/disclaimer/page.tsx`:
    - Full legal disclaimer: "Not financial advice", data delay notice, no warranties
    - Source attribution: "Data provided by Financial Modeling Prep"
  - Create `src/app/(marketing)/legal/privacy/page.tsx`:
    - Basic privacy policy: what data is collected (email, usage), cookies, third parties (Stripe, Supabase, Resend)
  - Create `src/app/(marketing)/legal/terms/page.tsx`:
    - Basic terms of service: acceptable use, no guarantees, limitation of liability
  - Add `robots.txt` and `sitemap.xml` route:
    - `src/app/robots.ts` — allow all, reference sitemap
    - `src/app/sitemap.ts` — static routes + dynamic politician pages
  - Add `<link rel="canonical">` to all pages

  **Must NOT do**:
  - Do NOT use a CMS for legal pages (static markdown/JSX is fine)
  - Do NOT add a blog
  - Do NOT add Google Analytics (future task)
  - Do NOT use a legal page generator service

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Metadata additions + static legal pages — no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — with Tasks 26-30
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: Task 1 (project exists)

  **References**:

  **External References**:
  - Next.js metadata: `https://nextjs.org/docs/app/building-your-application/optimizing/metadata` — Static and dynamic metadata
  - Next.js sitemap: `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap` — Sitemap generation
  - Next.js robots: `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots` — robots.txt generation

  **WHY Each Reference Matters**:
  - Next.js metadata API defines how to set titles, descriptions, and OG tags per route
  - Sitemap and robots.txt are essential for search engine indexing

  **Acceptance Criteria**:

  - [ ] All pages have appropriate `<title>` and `<meta name="description">`
  - [ ] `/legal/disclaimer`, `/legal/privacy`, `/legal/terms` render
  - [ ] `/robots.txt` returns valid robots.txt
  - [ ] `/sitemap.xml` returns valid XML sitemap
  - [ ] Dynamic pages (politician, stock) have dynamic titles
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: SEO metadata is present on landing page
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s http://localhost:3000 | grep -o '<title>[^<]*</title>'`
      2. Verify title contains "CapitolTrades" or app name
      3. Run `curl -s http://localhost:3000 | grep 'meta name="description"'`
      4. Verify description meta tag exists
    Expected Result: Title and description present
    Failure Indicators: Default "Create Next App" title, missing description
    Evidence: .sisyphus/evidence/task-31-seo-metadata.txt

  Scenario: Legal pages render
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/legal/disclaimer`
      2. Check status is 200
      3. Repeat for /legal/privacy and /legal/terms
    Expected Result: All 3 legal pages return 200
    Failure Indicators: Any 404 or 500
    Evidence: .sisyphus/evidence/task-31-legal-pages.txt
  ```

  **Commit**: YES
  - Message: `feat(seo): add metadata, legal pages, sitemap, and robots.txt`
  - Files: metadata additions to all page files, `src/app/(marketing)/legal/disclaimer/page.tsx`, `src/app/(marketing)/legal/privacy/page.tsx`, `src/app/(marketing)/legal/terms/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`
  - Pre-commit: `bun run build`

### Wave 7 — Deploy (After Wave 6)

- [ ] 32. Rate Limiting on Public API Routes

  **What to do**:
  - Install `@upstash/ratelimit` and `@upstash/redis` packages
  - Create `src/lib/rate-limit.ts` utility that exports a configurable rate limiter using Upstash Redis (sliding window algorithm)
  - Define rate limit tiers: anonymous (20 req/min), free authenticated (60 req/min), premium (200 req/min)
  - Create `src/lib/middleware/rate-limit.ts` — a reusable wrapper function for API route handlers that:
    - Extracts identifier from Supabase session (user ID) or falls back to IP (`request.headers.get('x-forwarded-for')`)
    - Looks up user's subscription tier from `profiles` table (cache in memory for 60s)
    - Applies the correct rate limit tier
    - Returns `429 Too Many Requests` with `Retry-After` header when exceeded
    - Passes through to handler when under limit
  - Apply rate limiting wrapper to these API routes: `/api/trades`, `/api/politicians`, `/api/politicians/[slug]`, `/api/stocks/[symbol]`, `/api/export/csv`
  - Do NOT apply rate limiting to: `/api/webhooks/stripe` (Stripe needs unrestricted access), `/api/cron/sync-trades` (internal), `/api/auth/*` (Supabase handles its own)
  - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`
  - Write tests: rate limiter returns correct limits per tier, 429 response format, Retry-After header value, IP fallback when no session

  **Must NOT do**:
  - Don't use in-memory rate limiting (won't work across serverless invocations)
  - Don't rate limit webhook or cron routes
  - Don't block Stripe webhook signature verification with rate limits
  - Don't add rate limiting to static pages or server components

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend middleware pattern requiring understanding of serverless constraints and Redis integration
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `stripe-payments`: Rate limiting is independent of Stripe logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 33, 34)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 17-21 (API routes must exist), Task 22 (webhook route must exist)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/lib/supabase/middleware.ts` — How middleware wraps route handlers; follow the same pattern for rate limit wrapper
  - `src/app/api/trades/route.ts` — Example API route to apply rate limiting to; shows request/response pattern

  **API/Type References** (contracts to implement against):
  - `src/lib/supabase/server.ts` — How to get Supabase server client for checking user session in rate limiter
  - `src/types/` — Subscription tier types to determine rate limit bucket

  **External References** (libraries and frameworks):
  - `https://upstash.com/docs/redis/sdks/ratelimit-ts/overview` — Upstash rate limit SDK: sliding window config, `limit()` method, response shape with `{ success, limit, remaining, reset }`
  - `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` — Next.js route handler patterns for wrapping with middleware

  **WHY Each Reference Matters**:
  - Supabase middleware shows the established pattern for extracting session in API routes — rate limiter must use the same approach
  - Upstash docs show the exact API for sliding window rate limiting in serverless — critical for correct Vercel deployment
  - Existing API routes show the response format the rate limiter must preserve when passing through

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file: `src/lib/__tests__/rate-limit.test.ts`
  - [ ] `bun test src/lib/__tests__/rate-limit.test.ts` → PASS (6+ tests)
  - [ ] Tests cover: anonymous limit (20/min), free limit (60/min), premium limit (200/min), 429 response shape, Retry-After header, IP fallback

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Rate limit returns 429 after exceeding anonymous limit
    Tool: Bash (curl)
    Preconditions: Dev server running, no auth cookie set, Upstash Redis connected
    Steps:
      1. Run a loop: `for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/trades; done`
      2. Capture last 5 response codes
      3. Assert that at least one response is 429
      4. Run: `curl -s -D - http://localhost:3000/api/trades` (after limit exceeded)
      5. Assert response headers contain `Retry-After`
    Expected Result: First 20 requests return 200, requests 21+ return 429 with Retry-After header
    Failure Indicators: All 25 requests return 200 (rate limiting not applied), or 429 missing Retry-After header
    Evidence: .sisyphus/evidence/task-32-rate-limit-429.txt

  Scenario: Stripe webhook route is NOT rate limited
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Run: `for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/webhooks/stripe; done`
      2. Capture all response codes
      3. Assert NONE are 429 (they may be 400 due to missing signature, but never 429)
    Expected Result: Zero 429 responses — webhook route bypasses rate limiting entirely
    Failure Indicators: Any 429 response code in the output
    Evidence: .sisyphus/evidence/task-32-webhook-no-ratelimit.txt
  ```

  **Evidence to Capture:**
  - [ ] task-32-rate-limit-429.txt — curl output showing 429 after exceeding limit
  - [ ] task-32-webhook-no-ratelimit.txt — curl output confirming webhook not rate limited

  **Commit**: YES
  - Message: `feat(api): add Upstash rate limiting to public API routes`
  - Files: `src/lib/rate-limit.ts`, `src/lib/middleware/rate-limit.ts`, `src/lib/__tests__/rate-limit.test.ts`, updated API route files, `.env.example`
  - Pre-commit: `bun test src/lib/__tests__/rate-limit.test.ts`

- [ ] 33. Vercel Deployment Configuration + Stripe Production Setup

  **What to do**:
  - Create `vercel.json` with configuration:
    - `crons`: `[{ "path": "/api/cron/sync-trades", "schedule": "0 */4 * * *" }]` (every 4 hours)
    - `headers`: security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
    - `regions`: `["iad1"]` (US East — closest to SEC/FMP data sources)
  - Update `next.config.ts`:
    - Add `images.remotePatterns` for any external image domains if needed
    - Ensure `serverExternalPackages` includes any Node-only deps
    - Add `headers()` function for security headers on all routes
  - Create `.env.production.example` documenting ALL required production env vars:
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
    - `FMP_API_KEY`
    - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`
    - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
    - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
    - `NEXT_PUBLIC_APP_URL`
    - `CRON_SECRET`
  - Add `CRON_SECRET` authorization check to `/api/cron/sync-trades` route — verify `request.headers.get('authorization') === \`Bearer \${process.env.CRON_SECRET}\`` and return 401 if missing
  - Create `scripts/setup-stripe-production.ts` — a one-time script that:
    - Creates the production Stripe product ("Insider Trading Pro")
    - Creates the production Stripe price ($9.99/month recurring)
    - Logs the price ID to set as `STRIPE_PRICE_ID` env var
    - Configures Stripe Customer Portal settings via API (cancellation, plan changes disabled)
  - Write a deployment checklist in `DEPLOY.md` with step-by-step instructions

  **Must NOT do**:
  - Don't hardcode any secrets or API keys
  - Don't enable Stripe live mode keys in development
  - Don't skip the cron authorization check
  - Don't add unnecessary Vercel config (keep minimal)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mostly configuration files and documentation — straightforward but important
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `stripe-payments`: The Stripe setup script is simple product/price creation, not complex integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 32, 34)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Task 14 (cron route must exist), Task 22 (Stripe integration must exist)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/app/api/cron/sync-trades/route.ts` — The cron route that needs authorization check added
  - `src/app/api/webhooks/stripe/route.ts` — Example of secure route with secret verification (follow same pattern for cron auth)
  - `.env.example` — Current env var list to extend for production

  **API/Type References** (contracts to implement against):
  - `src/lib/stripe.ts` — Stripe client setup to reference for the production setup script

  **External References** (libraries and frameworks):
  - `https://vercel.com/docs/cron-jobs` — Vercel Cron configuration in vercel.json, `CRON_SECRET` authorization pattern
  - `https://vercel.com/docs/projects/project-configuration` — vercel.json full reference for headers, regions, crons
  - `https://docs.stripe.com/api/products/create` — Stripe product creation for setup script
  - `https://docs.stripe.com/api/prices/create` — Stripe price creation for setup script

  **WHY Each Reference Matters**:
  - Cron route needs auth check added — reference shows current route structure to wrap
  - Stripe webhook route shows the pattern for secret-based authorization — cron auth should be similar
  - Vercel cron docs specify the exact `CRON_SECRET` header pattern Vercel sends — must match exactly

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file: `src/app/api/cron/__tests__/sync-trades.test.ts`
  - [ ] `bun test src/app/api/cron/__tests__/sync-trades.test.ts` → PASS (cron auth check tests)
  - [ ] Tests cover: valid CRON_SECRET returns 200, missing auth returns 401, wrong secret returns 401

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Cron route rejects unauthorized requests
    Tool: Bash (curl)
    Preconditions: Dev server running, CRON_SECRET set in .env
    Steps:
      1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cron/sync-trades` (no auth header)
      2. Assert response is 401
      3. `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-secret" http://localhost:3000/api/cron/sync-trades`
      4. Assert response is 401
      5. `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-trades`
      6. Assert response is 200 (or 500 if FMP not configured, but NOT 401)
    Expected Result: Only requests with correct CRON_SECRET in Authorization header are accepted
    Failure Indicators: Unauthenticated request returns 200, or authenticated request returns 401
    Evidence: .sisyphus/evidence/task-33-cron-auth.txt

  Scenario: vercel.json is valid and complete
    Tool: Bash
    Preconditions: vercel.json exists in project root
    Steps:
      1. `cat vercel.json | bun -e "const c = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('crons:', c.crons?.length, 'headers:', c.headers?.length)"`
      2. Assert crons array has 1 entry with path "/api/cron/sync-trades" and schedule "0 */4 * * *"
      3. Assert headers array contains security headers
      4. `bun run build` to verify config doesn't break build
    Expected Result: vercel.json parses correctly with cron schedule and security headers; build succeeds
    Failure Indicators: JSON parse error, missing crons, missing headers, build failure
    Evidence: .sisyphus/evidence/task-33-vercel-config.txt

  Scenario: All production env vars documented
    Tool: Bash
    Preconditions: .env.production.example exists
    Steps:
      1. `cat .env.production.example`
      2. Assert file contains all 14 required env var keys: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FMP_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_ID, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL, CRON_SECRET
      3. Assert each has a descriptive comment
    Expected Result: All 14 env vars present with comments explaining purpose and where to get each value
    Failure Indicators: Missing env vars, no comments, incorrect var names
    Evidence: .sisyphus/evidence/task-33-env-production.txt
  ```

  **Evidence to Capture:**
  - [ ] task-33-cron-auth.txt — curl output showing 401/200 responses
  - [ ] task-33-vercel-config.txt — vercel.json validation output + build result
  - [ ] task-33-env-production.txt — .env.production.example contents

  **Commit**: YES
  - Message: `feat(deploy): add Vercel config, cron auth, production env template, and Stripe setup script`
  - Files: `vercel.json`, `next.config.ts` (updated), `.env.production.example`, `scripts/setup-stripe-production.ts`, `DEPLOY.md`, updated cron route
  - Pre-commit: `bun test && bun run build`

- [ ] 34. Full Test Suite Run + Final Fixes

  **What to do**:
  - Run the COMPLETE test suite: `bun test` from project root
  - Fix ALL failing tests — categorize failures:
    - **Import errors**: Missing exports, wrong paths — fix immediately
    - **Type errors**: Interface mismatches between modules — fix types or update tests
    - **Logic errors**: Actual bugs found by tests — fix implementation
    - **Flaky tests**: Timing-dependent or order-dependent — add proper async handling or isolation
  - Run `bunx tsc --noEmit` for full type checking — fix ALL type errors
  - Run `bun run build` — fix ALL build errors
  - Run `bun run lint` (if ESLint configured) — fix ALL lint errors (or add `.eslintrc` if missing)
  - Verify dev server starts cleanly: `bun run dev` — check for console errors
  - Run a quick smoke test of the full app:
    - Visit `/` (landing page loads)
    - Visit `/trades` (trade feed loads, even if empty before first sync)
    - Visit `/politicians` (directory loads)
    - Visit `/pricing` (pricing page loads with Stripe link)
    - Visit `/login` and `/signup` (auth pages render)
  - Document any remaining known issues or tech debt in `TODO.md` (create if not exists)

  **Must NOT do**:
  - Don't skip failing tests — fix them all
  - Don't use `@ts-ignore` or `as any` to suppress type errors
  - Don't delete tests to make the suite pass
  - Don't add `--passWithNoTests` or similar flags to hide problems
  - Don't introduce new features — only fix what's broken

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding cross-module interactions, debugging failures across the full codebase, and making targeted fixes without breaking other things
  - **Skills**: [`playwright`]
    - `playwright`: Needed for smoke-testing the dev server pages in a real browser
  - **Skills Evaluated but Omitted**:
    - `stripe-payments`: Not adding Stripe features, just fixing existing tests

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (must run AFTER Tasks 32-33 complete)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 32, 33 (all implementation must be complete)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/**/__tests__/*.test.ts` — All test files in the project; scan for failing patterns
  - `vitest.config.ts` — Test configuration for understanding test environment setup
  - `tsconfig.json` — TypeScript configuration for understanding type checking rules

  **API/Type References** (contracts to implement against):
  - `src/types/*.ts` — All type definitions; type errors often stem from interface mismatches here
  - `src/lib/*.ts` — Core library modules; import errors often trace back to missing exports here

  **External References** (libraries and frameworks):
  - `https://vitest.dev/guide/debugging` — Vitest debugging guide for diagnosing test failures
  - `https://nextjs.org/docs/app/building-your-application/deploying` — Next.js build requirements and common build errors

  **WHY Each Reference Matters**:
  - Test files are the primary target — need to understand all test patterns to fix failures systematically
  - Type definitions are the most common source of cross-module type errors — check these first
  - Vitest debugging docs help diagnose non-obvious test failures (mocking issues, environment problems)

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] `bun test` → ALL PASS (0 failures)
  - [ ] `bunx tsc --noEmit` → 0 errors
  - [ ] `bun run build` → successful build, 0 errors
  - [ ] `bun run lint` → 0 errors (warnings acceptable)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full test suite passes with zero failures
    Tool: Bash
    Preconditions: All previous tasks (1-33) complete
    Steps:
      1. `bun test 2>&1` — capture full output
      2. Assert output contains "Tests: X passed" and "0 failed"
      3. `bunx tsc --noEmit 2>&1` — capture output
      4. Assert zero error lines in output
      5. `bun run build 2>&1` — capture output
      6. Assert output contains "✓" or "Compiled successfully" or similar success indicator
    Expected Result: All tests pass, zero type errors, successful build
    Failure Indicators: Any test failure, any tsc error, build failure
    Evidence: .sisyphus/evidence/task-34-test-suite.txt

  Scenario: Dev server smoke test — all pages render
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to `http://localhost:3000/` — assert page contains "insider" or app name text (case insensitive)
      2. Navigate to `http://localhost:3000/trades` — assert page contains "trades" heading or trade-related content
      3. Navigate to `http://localhost:3000/politicians` — assert page contains "politicians" or "members" heading
      4. Navigate to `http://localhost:3000/pricing` — assert page contains "$9.99" or "Pro" or pricing-related content
      5. Navigate to `http://localhost:3000/login` — assert page contains email input field (selector: `input[type="email"]`)
      6. Navigate to `http://localhost:3000/signup` — assert page contains email input field (selector: `input[type="email"]`)
      7. Take screenshot of each page
    Expected Result: All 6 pages load without errors, render expected content, no blank pages
    Failure Indicators: 404 on any route, blank page, console errors, missing expected content
    Evidence: .sisyphus/evidence/task-34-smoke-home.png, .sisyphus/evidence/task-34-smoke-trades.png, .sisyphus/evidence/task-34-smoke-politicians.png, .sisyphus/evidence/task-34-smoke-pricing.png, .sisyphus/evidence/task-34-smoke-login.png, .sisyphus/evidence/task-34-smoke-signup.png

  Scenario: No TypeScript errors in codebase
    Tool: Bash
    Preconditions: All source files complete
    Steps:
      1. `bunx tsc --noEmit 2>&1 | head -50` — capture any errors
      2. `bunx tsc --noEmit 2>&1 | grep -c "error TS"` — count errors
      3. Assert error count is 0
    Expected Result: Zero TypeScript errors across entire codebase
    Failure Indicators: Any line matching "error TS" in output
    Evidence: .sisyphus/evidence/task-34-typescript-check.txt
  ```

  **Evidence to Capture:**
  - [ ] task-34-test-suite.txt — Full test suite output showing all pass
  - [ ] task-34-smoke-*.png — Screenshots of all 6 pages loading correctly
  - [ ] task-34-typescript-check.txt — tsc --noEmit output showing 0 errors

  **Commit**: YES
  - Message: `fix: resolve all test failures, type errors, and build issues`
  - Files: any files modified to fix test/type/build errors, `TODO.md` (if created)
  - Pre-commit: `bun test && bunx tsc --noEmit && bun run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bunx tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start dev server. Navigate to every page. Test: signup → login → view trades → search politician → view politician → follow politician (premium) → check pricing page → complete Stripe checkout → verify premium access → export CSV → check alert settings. Test on mobile viewport. Save screenshots.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

Each task includes its own commit message. Format: `type(scope): description`
- `chore(scaffold)`: Project setup tasks
- `feat(auth)`: Authentication features
- `feat(data)`: Data sync and FMP integration
- `feat(ui)`: Page and component features
- `feat(stripe)`: Payment integration
- `feat(alerts)`: Alert system
- `feat(admin)`: Admin features
- `fix(*)`: Bug fixes discovered during development
- `test(*)`: Test additions

---

## Success Criteria

### Verification Commands
```bash
bun test                     # Expected: all tests pass
bun run build                # Expected: 0 errors
curl http://localhost:3000   # Expected: 200 with landing page
curl http://localhost:3000/api/trades?limit=5  # Expected: 200 with JSON array
curl http://localhost:3000/api/trades (no auth, premium endpoint) # Expected: last 30 days only
```

### Final Checklist
- [ ] All "Must Have" present and functioning
- [ ] All "Must NOT Have" absent from codebase
- [ ] All tests pass (`bun test`)
- [ ] Production build succeeds (`bun run build`)
- [ ] Data sync pipeline works end-to-end
- [ ] Stripe checkout creates subscription
- [ ] Email alerts fire for followed politicians
- [ ] Responsive on mobile viewport (375px)
- [ ] Legal disclaimer present on all data pages
- [ ] Deploy to Vercel succeeds
