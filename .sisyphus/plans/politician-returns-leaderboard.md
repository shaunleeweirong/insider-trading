# Politician Returns Leaderboard

## TL;DR

> **Quick Summary**: Build a pre-computed politician returns leaderboard at `/leaderboard` that reconstructs virtual portfolios from congressional trade disclosures, prices positions using FMP historical data, and displays YTD/L12M/5Y percentage returns for all politicians with sufficient trading activity.
> 
> **Deliverables**:
> - New Supabase table `politician_returns` with migration + RLS policies
> - Pure-function portfolio computation engine (midpoint amounts → position reconstruction → return calculation)
> - Monthly Vercel cron job to refresh returns
> - Server-rendered leaderboard page at `/leaderboard`
> - Navigation item in top-nav and mobile-nav
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Task 9 → F1-F4

---

## Context

### Original Request
User asked: "Is there a way to build a tab/page which showcases politicians with the best returns YTD and L12M and Last 5 years?" — confirmed that FMP does not provide a returns endpoint, so returns must be computed from trade disclosure data + historical stock prices.

### Interview Summary
**Key Discussions**:
- **Amount modeling**: Use midpoint of disclosure ranges (industry standard, confirmed by CongressTrader/Congress Stock Tracker methodology)
- **Refresh frequency**: Monthly (~200-400 FMP calls/refresh, very cheap)
- **Access level**: Leaderboard visible to all; detailed trade history requires premium
- **Page location**: New top-level `/leaderboard` in main navigation
- **Time windows**: YTD, L12M, 5Y

**Research Findings**:
- CongressTrader methodology: capital deployed per-trade, track open/closed positions, mark-to-market open positions
- Transaction types in DB: `Purchase`, `Sale`, `Sale (Partial)`, `Sale (Full)`, `Exchange` (NO "Exercise" type exists)
- Amount parser returns `{min: 0, max: 0}` for unparseable strings; "Over $X" returns `{min: X, max: X}`
- Existing codebase has cron pattern (`vercel.json` + `/api/cron/sync-trades`), stock price caching, server component pages
- ~115 politicians, ~5,100 trades, ~200-400 unique tickers in DB

### Metis Review
**Identified Gaps** (addressed):
- **"Exercise" doesn't exist in DB** — corrected to use actual transaction types: Purchase, Sale, Sale (Partial), Sale (Full), Exchange
- **Sale (Partial) handling** — use amount range to estimate shares sold (amount / price at trade date); don't close full position
- **Open-ended top bucket ($50M+)** — amount parser returns min=max=$50M; midpoint = $50M (floor); apply default to use $50M as-is (conservative)
- **NULL tickers** — silently exclude from return calculations (can't price them)
- **Delisted/unresolvable tickers** — skip trade, increment `unresolvable_tickers` counter
- **FMP rate limiting during bulk computation** — add throttling (5 req/s with backoff)
- **Vercel function timeout risk** — batch computation per politician, not all-at-once
- **Minimum trade threshold** — require 3+ eligible trades for leaderboard inclusion
- **Stock splits** — rely on FMP's adjusted prices (default behavior)
- **Dividends** — price return only for v1 (not total return)
- **"Last updated" timestamp** — display computed_at on leaderboard
- **Methodology disclaimer** — small tooltip/disclaimer, not a full page

---

## Work Objectives

### Core Objective
Build a pre-computed politician returns leaderboard showing which congressional traders have the best estimated stock returns across YTD, Last 12 Months, and Last 5 Years time windows.

### Concrete Deliverables
- `supabase/migrations/004_politician_returns.sql` — new table + RLS + index
- `src/types/database.ts` — updated with `PoliticianReturn` type
- `src/lib/returns/midpoint.ts` — amount range → midpoint conversion
- `src/lib/returns/portfolio-engine.ts` — pure portfolio reconstruction + return computation
- `src/lib/returns/compute-returns.ts` — orchestrator wiring engine to Supabase/FMP
- `src/lib/returns/__tests__/midpoint.test.ts` — midpoint utility tests
- `src/lib/returns/__tests__/portfolio-engine.test.ts` — comprehensive portfolio engine tests
- `src/lib/returns/__tests__/compute-returns.test.ts` — orchestrator tests with mocked deps
- `src/app/api/cron/compute-returns/route.ts` — monthly cron endpoint
- `src/app/(app)/leaderboard/page.tsx` — server-rendered leaderboard page
- `src/components/nav/top-nav.tsx` — updated with Leaderboard nav item
- `src/components/nav/mobile-nav.tsx` — updated with Leaderboard nav item
- `vercel.json` — updated with monthly cron schedule

### Definition of Done
- [ ] `bun test` passes all existing 146 tests + new tests
- [ ] `curl http://localhost:3000/leaderboard` returns 200 with politician return data
- [ ] `curl http://localhost:3000/api/cron/compute-returns -H "Authorization: Bearer $CRON_SECRET"` returns 200 (GET — matches Vercel cron)
- [ ] Leaderboard uses tab-based UI: 3 tabs (YTD / L12M / 5Y), each tab shows a single "Return %" column with politicians sorted descending by return for the selected window. Default tab is YTD. Tabs are `<a>` links that set `?window=` query param.
- [ ] "Last updated" timestamp visible on leaderboard
- [ ] Nav item "Leaderboard" visible in both desktop and mobile navigation

### Must Have
- Pre-computed returns stored in Supabase (never compute on page load)
- **Three time windows**: YTD, L12M, and 5Y — each is a separate leaderboard tab showing one return % column
- **Returns are ALL-TIME** (computed from full trade history) — the window does NOT change the return calculation, only which politicians appear
- **Window = eligibility filter**: a politician appears on the YTD leaderboard only if they have ≥3 trades with `transaction_date >= Jan 1 of current year`; L12M uses ≥3 trades in last 12 months; 5Y uses ≥3 trades in last 5 years. The displayed return % is the same all-time return in every tab — only the roster of politicians changes.
- Midpoint of amount ranges for position sizing
- Position reconstruction: Purchase opens, Sale (Full) closes (with realized proceeds), Sale (Partial) partially closes (with partial realized proceeds)
- Mark-to-market open positions using current stock prices; total return = (unrealized + realized - deployed) / deployed
- Minimum 3 eligible trades *within the selected window* for leaderboard inclusion
- "Last updated" timestamp on leaderboard page
- Monthly automated refresh via Vercel cron
- Throttled FMP API calls (max 5 req/s) during computation
- Graceful handling of null tickers and delisted stocks
- Server component page following existing conventions

### Must NOT Have (Guardrails)
- NO individual politician performance detail pages (separate future feature)
- NO real-time price updates or WebSocket connections
- NO historical leaderboard snapshots (only current computed state)
- NO dividend tracking or total return calculations (price return only)
- NO explicit stock split handling (rely on FMP adjusted prices)
- NO methodology page (tooltip/disclaimer only)
- NO premium-gating on leaderboard page itself (only trade drill-through is premium)
- NO client components for the leaderboard page (server component pattern)
- NO direct FMP calls from page component (read pre-computed data only)
- NO modification of existing tables or RLS policies
- NO "Exercise" transaction type mapping (doesn't exist in DB)
- NO admin UI for triggering recomputation (API endpoint + cron sufficient)
- NO sorting beyond the three time windows + chamber/party filters
- NO multi-column return display (only ONE return % column per tab — never show YTD, L12M, and 5Y columns simultaneously)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest, 146 tests passing)
- **Automated tests**: TDD for computation engine, tests-after for page/cron
- **Framework**: vitest (via `bun test`)
- **TDD applies to**: midpoint.ts, portfolio-engine.ts, compute-returns.ts

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Computation logic**: Use Bash (bun test) — run unit tests, verify output
- **API endpoints**: Use Bash (curl) — send requests, assert status + response fields
- **Frontend page**: Use Playwright — navigate, assert DOM elements, screenshot
- **Navigation**: Use Playwright — verify link presence, click-through

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, start immediately):
├── Task 1: Database migration + TypeScript types [quick]
├── Task 2: Midpoint utility + tests (TDD) [quick]
└── Task 3: Portfolio engine + tests (TDD) [deep]

Wave 2 (Wiring — depends on Wave 1):
├── Task 4: Admin trigger endpoint (depends: 1) [quick]
├── Task 5: Computation orchestrator + tests (depends: 1, 2, 3) [deep]
└── Task 6: Navigation updates (depends: none, but group here) [quick]

Wave 3 (Delivery — depends on Wave 2):
├── Task 7: Cron route + vercel.json (depends: 5) [quick]
├── Task 8: Leaderboard page (depends: 1, 6) [unspecified-high]
└── Task 9: Initial data seed + E2E validation (depends: 5, 7, 8) [deep]

Wave FINAL (Verification — after ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 4, 5, 8 | 1 |
| 2 | — | 5 | 1 |
| 3 | — | 5 | 1 |
| 4 | 1 | 9 | 2 |
| 5 | 1, 2, 3 | 7, 9 | 2 |
| 6 | — | 8 | 2 |
| 7 | 5 | 9 | 3 |
| 8 | 1, 6 | 9 | 3 |
| 9 | 5, 7, 8 | F1-F4 | 3 |
| F1-F4 | 9 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `deep`
- **Wave 2**: 3 tasks — T4 → `quick`, T5 → `deep`, T6 → `quick`
- **Wave 3**: 3 tasks — T7 → `quick`, T8 → `unspecified-high`, T9 → `deep`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Database Migration + TypeScript Types

  **What to do**:
  - Create `supabase/migrations/004_politician_returns.sql` with the `politician_returns` table:
    ```sql
    CREATE TABLE politician_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
      time_window TEXT NOT NULL CHECK (time_window IN ('ytd', 'l12m', 'l5y')),
      total_return_pct NUMERIC(10,4),
      deployed_capital NUMERIC(14,2),
      current_value NUMERIC(14,2),
      total_trades INTEGER NOT NULL DEFAULT 0,
      open_positions INTEGER NOT NULL DEFAULT 0,
      closed_positions INTEGER NOT NULL DEFAULT 0,
      unresolvable_tickers INTEGER NOT NULL DEFAULT 0,
      computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (politician_id, time_window)
    );
    CREATE INDEX idx_politician_returns_window_return ON politician_returns(time_window, total_return_pct DESC);
    ```
  - Add RLS policies following the pattern in `003_rls_policies.sql`:
    - `SELECT` enabled for all (public read)
    - `ALL` for service_role (computation writes)
  - Add `PoliticianReturn` type to `src/types/database.ts` matching the table columns
  - Run the migration against the live Supabase database using the Supabase MCP or dashboard SQL editor

  **Must NOT do**:
  - Do NOT modify any existing tables or their RLS policies
  - Do NOT add columns to the `politicians` or `trades` tables

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single migration file + one type addition — straightforward, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `stripe-payments`: No payment logic involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `supabase/migrations/001_core_tables.sql` — Table creation pattern: column types, constraints, DEFAULT values, foreign keys
  - `supabase/migrations/003_rls_policies.sql` — RLS policy pattern: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, policy names, roles
  - `supabase/migrations/002_supporting_tables.sql` — Index creation pattern

  **API/Type References** (contracts to implement against):
  - `src/types/database.ts:1-103` — Existing type definitions (Politician, Trade, Profile, StockPrice) — follow the same interface style for PoliticianReturn

  **WHY Each Reference Matters**:
  - `001_core_tables.sql`: Shows the exact SQL style (gen_random_uuid(), TIMESTAMPTZ DEFAULT now(), REFERENCES with ON DELETE) to mirror
  - `003_rls_policies.sql`: Shows the exact RLS pattern (enable_rls + policy per role) — new table MUST follow this or queries will fail
  - `database.ts`: The PoliticianReturn type MUST match column names exactly (snake_case in DB, camelCase in TS) for Supabase client to work

  **Acceptance Criteria**:
  - [ ] File `supabase/migrations/004_politician_returns.sql` exists with CREATE TABLE, RLS, and index
  - [ ] `src/types/database.ts` contains `PoliticianReturn` interface with all columns typed
  - [ ] `bun test` → PASS (146 tests, 0 failures — no regression)
  - [ ] Migration executed: `SELECT count(*) FROM politician_returns` returns 0 (table exists, empty)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Table creation verification
    Tool: Bash (Supabase MCP or curl)
    Preconditions: Migration SQL executed against live Supabase
    Steps:
      1. Query: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'politician_returns' ORDER BY ordinal_position
      2. Assert columns match: id (uuid), politician_id (uuid), time_window (text), total_return_pct (numeric), deployed_capital (numeric), current_value (numeric), total_trades (integer), open_positions (integer), closed_positions (integer), unresolvable_tickers (integer), computed_at (timestamp with time zone), created_at (timestamp with time zone)
      3. Query: SELECT count(*) FROM politician_returns → 0
    Expected Result: All 12 columns present with correct types, table empty
    Failure Indicators: Column missing, wrong type, table doesn't exist
    Evidence: .sisyphus/evidence/task-1-table-schema.txt

  Scenario: RLS policy verification
    Tool: Bash (Supabase MCP)
    Preconditions: Migration executed
    Steps:
      1. Query: SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'politician_returns'
      2. Assert: At least one policy with cmd='SELECT' and roles containing '{}'(public) or similar
      3. Attempt anonymous SELECT: should succeed
    Expected Result: RLS enabled, public SELECT policy exists
    Failure Indicators: No policies found, anonymous SELECT blocked
    Evidence: .sisyphus/evidence/task-1-rls-policies.txt

  Scenario: Unique constraint verification
    Tool: Bash (Supabase MCP)
    Preconditions: Table exists, politicians table has at least one row
    Steps:
      1. Query an existing politician_id: SELECT id FROM politicians LIMIT 1 → save as $POLITICIAN_ID
      2. INSERT a row: INSERT INTO politician_returns (politician_id, time_window, total_return_pct, total_trades) VALUES ($POLITICIAN_ID, 'ytd', 10.5, 5)
      3. INSERT duplicate row with same politician_id + time_window: INSERT INTO politician_returns (politician_id, time_window, total_return_pct, total_trades) VALUES ($POLITICIAN_ID, 'ytd', 20.0, 3)
      4. Assert: Second INSERT fails with unique constraint violation (error containing "duplicate key" or "unique constraint")
      5. DELETE test rows: DELETE FROM politician_returns WHERE politician_id = $POLITICIAN_ID
    Expected Result: Unique constraint (politician_id, time_window) enforced — second insert fails
    Failure Indicators: Second INSERT succeeds (both rows exist)
    Evidence: .sisyphus/evidence/task-1-unique-constraint.txt
  ```

  **Commit**: YES (Commit 1)
  - Message: `feat(db): add politician_returns table migration + types`
  - Files: `supabase/migrations/004_politician_returns.sql`, `src/types/database.ts`
  - Pre-commit: `bun test`

- [ ] 2. Midpoint Amount Utility + Tests (TDD)

  **What to do**:
  - Create `src/lib/returns/midpoint.ts` with:
    - `getMidpoint(min: number, max: number): number` — returns midpoint of amount range
    - Handle edge cases: min === max (e.g., "Over $50M" → use min as-is), min === 0 && max === 0 (unparseable → return 0), min > max (invalid → return 0)
    - Standard congressional disclosure ranges with their midpoints:
      - $1,001–$15,000 → $8,000.50
      - $15,001–$50,000 → $32,500.50
      - $50,001–$100,000 → $75,000.50
      - $100,001–$250,000 → $175,000.50
      - $250,001–$500,000 → $375,000.50
      - $500,001–$1,000,000 → $750,000.50
      - $1,000,001–$5,000,000 → $2,500,000.50 (round to $2,500,001)
      - $5,000,001–$25,000,000 → $15,000,000.50
      - $25,000,001–$50,000,000 → $37,500,000.50
      - $50,000,001+ → $50,000,001 (use floor, conservative)
  - **TDD**: Write test file FIRST at `src/lib/returns/__tests__/midpoint.test.ts` with all edge cases, then implement to pass

  **Must NOT do**:
  - Do NOT modify the existing `src/lib/sync/amount-parser.ts` — midpoint is a NEW utility that consumes its output
  - Do NOT add any Supabase or FMP dependencies — this is a pure function

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single pure function with simple math, no external dependencies
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/lib/sync/amount-parser.ts` — Shows how amount ranges are parsed from raw strings; the output `{min, max}` is the INPUT to this midpoint function
  - `src/lib/sync/__tests__/amount-parser.test.ts` — Test structure pattern to follow (vitest, describe blocks, edge cases)

  **Test References**:
  - `src/lib/fmp/__tests__/client.test.ts` — Vitest test structure used in this project (import vi, describe, it, expect pattern)

  **WHY Each Reference Matters**:
  - `amount-parser.ts`: You MUST understand what `{min, max}` values look like in practice — specifically that "Over $X" produces `{min: X, max: X}` and unparseable strings produce `{min: 0, max: 0}`. Your midpoint function must handle these edge cases.
  - `amount-parser.test.ts`: Copy the exact test file structure (imports, describe nesting, assertion style) for consistency

  **Acceptance Criteria**:
  - [ ] Test file created: `src/lib/returns/__tests__/midpoint.test.ts`
  - [ ] Implementation file created: `src/lib/returns/midpoint.ts`
  - [ ] `bun test src/lib/returns/__tests__/midpoint.test.ts` → PASS (all cases)
  - [ ] `bun test` → PASS (146 + new tests, 0 failures)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Happy path — standard disclosure ranges
    Tool: Bash (bun test)
    Preconditions: midpoint.ts and midpoint.test.ts exist
    Steps:
      1. Run: bun test src/lib/returns/__tests__/midpoint.test.ts
      2. Assert all test cases pass:
         - getMidpoint(1001, 15000) ≈ 8000.5
         - getMidpoint(500001, 1000000) ≈ 750000.5
         - getMidpoint(5000001, 25000000) ≈ 15000000.5
    Expected Result: All standard range midpoints calculated correctly
    Failure Indicators: Any test failure, wrong midpoint values
    Evidence: .sisyphus/evidence/task-2-midpoint-tests.txt

  Scenario: Edge cases — zero, equal, invalid ranges
    Tool: Bash (bun test)
    Preconditions: Test file includes edge cases
    Steps:
      1. Assert: getMidpoint(0, 0) === 0 (unparseable amount)
      2. Assert: getMidpoint(50000001, 50000001) === 50000001 (top bucket, min===max)
      3. Assert: getMidpoint(15000, 1001) === 0 (invalid: min > max)
      4. Assert: getMidpoint(-1, 100) === 0 (invalid: negative)
    Expected Result: All edge cases return 0 or conservative floor value
    Failure Indicators: Any assertion fails
    Evidence: .sisyphus/evidence/task-2-midpoint-edge-cases.txt
  ```

  **Commit**: YES (Commit 2)
  - Message: `feat(returns): add midpoint amount utility with tests`
  - Files: `src/lib/returns/midpoint.ts`, `src/lib/returns/__tests__/midpoint.test.ts`
  - Pre-commit: `bun test`

- [ ] 3. Portfolio Reconstruction Engine + Tests (TDD)

  **What to do**:
  - Create `src/lib/returns/portfolio-engine.ts` with pure functions:
    - **Types** (define locally or in a types file):
      ```typescript
      type NormalizedTrade = {
        ticker: string;
        transactionDate: string; // ISO date
        transactionType: 'purchase' | 'sale' | 'sale_partial' | 'sale_full' | 'exchange';
        amountMin: number;
        amountMax: number;
      };
      type PriceMap = Record<string, Record<string, number>>; // ticker → date → close price
      type Position = {
        ticker: string;
        shares: number;
        costBasis: number; // total $ deployed
        openDate: string;
      };
      type PortfolioResult = {
        totalReturnPct: number;
        deployedCapital: number;
        currentValue: number;        // unrealized value of open positions
        realizedProceeds: number;     // cash received from all sales
        totalValue: number;           // currentValue + realizedProceeds
        openPositions: number;
        closedPositions: number;
        unresolvableTickers: number;
      };
      ```
    - `normalizeTxType(raw: string): NormalizedTrade['transactionType'] | null` — maps DB values:
      - "Purchase" → "purchase"
      - "Sale" → "sale"
      - "Sale (Partial)" → "sale_partial"
      - "Sale (Full)" → "sale_full"
      - "Exchange" → "exchange"
      - Everything else → null (excluded from computation)
    - `buildPortfolio(trades: NormalizedTrade[], priceMap: PriceMap)` — reconstructs positions AND tracks realized proceeds:
      - Returns: `{ positions: Position[], realizedProceeds: number, deployedCapital: number, unresolvableTickers: number }`
      - For each "purchase": estimate shares = midpoint(min, max) / priceOnDate, add to position, add midpoint to deployedCapital
      - For each "sale_full": record realized proceeds = position.shares × priceOnDate, remove position, increment closedPositions
      - For each "sale_partial": estimate shares sold = midpoint(min, max) / priceOnDate, record realized proceeds = sharesSold × priceOnDate, reduce position shares
      - For each "sale" (unspecified): treat as "sale_full" (conservative)
      - For "exchange": skip (complex, unreliable to model)
      - If priceOnDate not available for a trade: skip trade, count as unresolvable
      - **Key**: realized proceeds are accumulated as cash returned from sales. This is essential for correctly computing returns on closed positions.
    - `computeReturn(portfolio: { positions: Position[], realizedProceeds: number, deployedCapital: number, unresolvableTickers: number }, currentPrices: Record<string, number>): PortfolioResult`:
      - Value open positions: sum(shares × currentPrice) for each position → `currentValue`
      - Total value = currentValue + realizedProceeds
      - Return % = ((totalValue - deployedCapital) / deployedCapital) × 100
      - Handle: 0 deployed capital → return 0%, missing current price for open position → count as unresolvable, use 0 for that position's value
      - **Key**: this formula correctly handles fully closed positions (currentValue=0, but realizedProceeds > 0 captures the gain/loss)
    - `getWindowStartDate(window: 'ytd' | 'l12m' | 'l5y'): Date`:
      - Computes the window start date: YTD → Jan 1 of current year, L12M → 12 months ago, L5Y → 5 years ago
      - This date is used ONLY for eligibility filtering (counting how many trades fall within the window), NOT for filtering trades fed into the portfolio engine
      - **Explicitly**: ALL trades are always fed to `buildPortfolio()`. The window start date is used by the orchestrator (Task 5) to count in-window trades and decide whether the politician qualifies (≥3 in-window trades). The return % itself is always computed from full trade history.
  - **TDD**: Write comprehensive test file FIRST at `src/lib/returns/__tests__/portfolio-engine.test.ts`:
    - Test with deterministic data: hardcoded trades, hardcoded prices, known expected returns
    - Test cases:
      - Single purchase → price goes up → positive return (open position, mark-to-market)
      - Single purchase → price goes down → negative return
      - Purchase + Sale (Full) → realized gain (position closed, realizedProceeds > deployedCapital)
      - Purchase + Sale (Full) at loss → realized loss (realizedProceeds < deployedCapital)
      - Purchase + Sale (Partial) → partial position remains + partial realized proceeds
      - Multiple purchases of same ticker → position shares accumulate
      - Ticker with no price data → unresolvable counter increments
      - Zero eligible trades → return 0%, deployed 0
      - Only purchases, no sales → all open positions, realizedProceeds = 0
      - Exchange transaction → skipped
      - Unknown transaction type → excluded

  **Must NOT do**:
  - Do NOT import Supabase client, FMP client, or any I/O — pure functions only
  - Do NOT handle stock splits, dividends, or options
  - Do NOT import from `src/lib/sync/amount-parser.ts` — use the midpoint function from Task 2
  - Exchange transactions should be SKIPPED (return null from normalizeTxType is acceptable, or skip in buildPortfolio)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core algorithm with complex state management (position tracking), many edge cases, TDD with comprehensive test suite
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately — imports midpoint from Task 2 but can define inline for testing)

  **References**:

  **Pattern References**:
  - `src/lib/sync/trade-sync.ts:mapTransactionType()` (around line 20-35) — Shows how transaction types are currently mapped from FMP data; the portfolio engine uses a DIFFERENT mapping from DB values, but this shows the pattern
  - `src/lib/sync/amount-parser.ts` — Shows the `{min, max}` shape that feeds into midpoint calculation

  **API/Type References**:
  - `src/types/database.ts:Trade` — The Trade type from DB; portfolio engine will receive data shaped like this
  - `src/lib/fmp/client.ts:fetchHistoricalPrices` (around line 166-182) — Shows the shape of historical price data `{date, close}` that will become the PriceMap

  **Test References**:
  - `src/lib/sync/__tests__/trade-sync.test.ts` — Test structure for similar sync/computation logic; follow vitest patterns
  - `src/lib/fmp/__tests__/client.test.ts` — Mocking patterns used in project tests

  **WHY Each Reference Matters**:
  - `trade-sync.ts:mapTransactionType()`: Shows existing transaction type mapping — your normalizeTxType() handles a DIFFERENT set (DB values vs FMP raw values), but the pattern is similar
  - `database.ts:Trade`: You'll receive DB Trade objects and must extract ticker, transaction_date, transaction_type, amount_min, amount_max from them
  - `fetchHistoricalPrices`: The PriceMap structure mirrors what this function returns — `{date, close}` pairs per ticker

  **Acceptance Criteria**:
  - [ ] Test file created: `src/lib/returns/__tests__/portfolio-engine.test.ts` with 10+ test cases
  - [ ] Implementation file created: `src/lib/returns/portfolio-engine.ts`
  - [ ] `bun test src/lib/returns/__tests__/portfolio-engine.test.ts` → PASS (all cases)
  - [ ] `bun test` → PASS (146 + all new tests, 0 failures)
  - [ ] All functions are pure (no imports from supabase, fmp, or any I/O modules)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Happy path — purchase + price appreciation
    Tool: Bash (bun test)
    Preconditions: portfolio-engine.test.ts has deterministic test data
    Steps:
      1. Input: 1 trade — Purchase AAPL on 2024-01-15, amount $1,001-$15,000
      2. Price on 2024-01-15: $150.00 (from priceMap)
      3. Current price AAPL: $200.00 (from currentPrices)
      4. Midpoint: $8,000.50 → estimated shares: 8000.50/150 ≈ 53.34
      5. Current value: 53.34 × 200 = $10,668
      6. Expected return: ((10668 - 8000.50) / 8000.50) × 100 ≈ 33.33%
      7. Run test, assert return is approximately 33.33%
    Expected Result: Return ≈ 33.33%, deployedCapital ≈ 8000.50, openPositions = 1
    Failure Indicators: Wrong return percentage, wrong position count
    Evidence: .sisyphus/evidence/task-3-portfolio-happy-path.txt

  Scenario: Edge case — unresolvable ticker
    Tool: Bash (bun test)
    Preconditions: Test includes trade with ticker not in priceMap
    Steps:
      1. Input: 1 trade — Purchase XYZ on 2024-01-15, amount $1,001-$15,000
      2. priceMap has NO entry for XYZ
      3. Run computeReturn
      4. Assert: unresolvableTickers = 1, deployedCapital = 0, totalReturnPct = 0
    Expected Result: Trade skipped gracefully, unresolvable counter = 1
    Failure Indicators: Exception thrown, incorrect counter
    Evidence: .sisyphus/evidence/task-3-portfolio-unresolvable.txt

  Scenario: Complex — multiple trades with partial sale
    Tool: Bash (bun test)
    Preconditions: Test includes purchase + partial sale of same ticker
    Steps:
      1. Purchase MSFT on 2024-01-10, $15,001-$50,000 (midpoint ~$32,500)
      2. Sale (Partial) MSFT on 2024-06-15, $1,001-$15,000 (midpoint ~$8,000)
      3. Price on 2024-01-10: $350, on 2024-06-15: $420
      4. Current price MSFT: $450
      5. Shares bought: 32500/350 ≈ 92.86
      6. Shares sold: 8000/420 ≈ 19.05
      7. Remaining shares: 92.86 - 19.05 ≈ 73.81
      8. Realized proceeds from partial sale: 19.05 × 420 ≈ $8,001
      9. Current value of open position: 73.81 × 450 ≈ $33,214.50
      10. Total value: 33214.50 + 8001 = $41,215.50
      11. Deployed capital: $32,500 (initial purchase)
      12. Return: ((41215.50 - 32500) / 32500) × 100 ≈ 26.8%
    Expected Result: result.realizedProceeds ≈ 8001, result.currentValue ≈ 33214.50, result.totalValue ≈ 41215.50, result.totalReturnPct ≈ 26.8%, openPositions = 1
    Failure Indicators: Position fully closed, realizedProceeds = 0, wrong share count
    Evidence: .sisyphus/evidence/task-3-portfolio-partial-sale.txt
  ```

  **Commit**: YES (Commit 3)
  - Message: `feat(returns): add portfolio reconstruction engine with tests`
  - Files: `src/lib/returns/portfolio-engine.ts`, `src/lib/returns/__tests__/portfolio-engine.test.ts`
  - Pre-commit: `bun test`

- [ ] 4. Admin Trigger Endpoint for Returns Computation

  **What to do**:
  - Create `src/app/api/admin/trigger-compute/route.ts`:
    - POST handler that triggers the returns computation manually
    - Follows the pattern from `src/app/api/admin/trigger-sync/route.ts`:
      - Authenticate user via `supabase.auth.getUser()`
      - Check `profiles.is_admin` via service client
      - If admin, call the compute-returns orchestrator (from Task 5)
      - Return `{ success: true, message: "Returns computation triggered" }`
    - Wrap with `withRateLimit`
  - This allows manual triggering between monthly cron runs (useful for testing and after data imports)

  **Must NOT do**:
  - Do NOT add an admin UI — this is API-only
  - Do NOT skip the is_admin check

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Short route file following an exact existing pattern, minimal logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1 (needs table to exist), Task 5 (needs orchestrator to call — can stub import initially)

  **References**:

  **Pattern References**:
  - `src/app/api/admin/trigger-sync/route.ts:1-31` — EXACT pattern to copy: POST handler, auth check, is_admin check via service client, error handling, withRateLimit export

  **API/Type References**:
  - `src/lib/supabase/service.ts:4-12` — Service client creation for admin operations
  - `src/lib/middleware/rate-limit.ts` — withRateLimit wrapper

  **WHY Each Reference Matters**:
  - `trigger-sync/route.ts`: This is the EXACT template — copy structure, replace `syncTrades()` call with `computeAllReturns()` call. The auth pattern (getUser → service client → profiles.is_admin) must be identical.

  **Acceptance Criteria**:
  - [ ] File created: `src/app/api/admin/trigger-compute/route.ts`
  - [ ] `bun test` → PASS (no regression)
  - [ ] Unauthenticated POST returns 401
  - [ ] Non-admin POST returns 403

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Unauthenticated request rejected
    Tool: Bash (curl)
    Preconditions: Dev server running at localhost:3000
    Steps:
      1. curl -X POST http://localhost:3000/api/admin/trigger-compute
      2. Assert: HTTP 401
      3. Assert response body contains "error"
    Expected Result: 401 Unauthorized
    Failure Indicators: 200 response, 500 error
    Evidence: .sisyphus/evidence/task-4-admin-unauth.txt

  Scenario: Non-admin request rejected
    Tool: Bash (curl)
    Preconditions: Authenticated as non-admin user
    Steps:
      1. POST with valid auth cookie but non-admin user
      2. Assert: HTTP 403
    Expected Result: 403 Forbidden
    Failure Indicators: 200 response, computation triggered
    Evidence: .sisyphus/evidence/task-4-admin-forbidden.txt
  ```

  **Commit**: YES (groups with Commit 5)
  - Message: `feat(api): add returns computation cron + admin trigger endpoints`
  - Files: `src/app/api/admin/trigger-compute/route.ts`
  - Pre-commit: `bun test`

- [ ] 5. Computation Orchestrator + Tests

  **What to do**:
  - Create `src/lib/returns/compute-returns.ts`:
    - `computePoliticianReturns(politicianId: string, window: 'ytd' | 'l12m' | 'l5y')`:
      1. Fetch ALL trades for politician from Supabase (`trades` table) — do NOT filter by window dates
      2. Filter to eligible trades: non-null ticker, transaction type in [Purchase, Sale, Sale (Partial), Sale (Full)] (exclude Exchange and unknown types)
      3. Use `getWindowStartDate(window)` from portfolio-engine (Task 3) to get the window cutoff date
      4. Count in-window trades: eligible trades with `transaction_date >= windowStartDate` — this count determines leaderboard eligibility (≥3 required) AND is stored as `total_trades`
      5. **If in-window trades < 3**: skip this politician for this window (return null or skip upsert)
      6. **If in-window trades ≥ 3**: proceed with full-history return computation:
         - Get unique tickers from ALL eligible trades (not just in-window)
         - Fetch historical prices for each ticker using `getHistoricalPrices()` from `stock-price-service.ts` — with 200ms delay between calls (throttling). Date range: from earliest trade date to today.
         - Fetch current prices for open-position tickers using `getStockQuote()` — with 200ms delay
         - Call portfolio engine: `buildPortfolio(allEligibleTrades, priceMap)` then `computeReturn(portfolio, currentPrices)`
         - **The return % is always computed from FULL trade history** — the window only determined eligibility above
      7. Return `PortfolioResult`
    - `computeAllReturns()`:
      1. Fetch all politicians from Supabase
      2. For each politician, for each window ['ytd', 'l12m', 'l5y']:
         - Call `computePoliticianReturns()`
         - If trades within window >= 3: upsert result into `politician_returns` table
         - If trades within window < 3: delete any existing row for this politician+window
      3. Process politicians sequentially (to avoid FMP rate limiting)
      4. Log progress: "Computing returns for {name} ({n}/{total})..."
      5. Return summary: `{ processed: N, skipped: N, errors: N }`
    - Use `createServiceClient()` for all Supabase operations (this runs as a background job, not user-initiated)
    - Add throttling between FMP calls: `await new Promise(r => setTimeout(r, 200))` between each price fetch
  - Create `src/lib/returns/__tests__/compute-returns.test.ts`:
    - Mock Supabase client (vi.mock) to return hardcoded trades and politicians
    - Mock stock-price-service to return hardcoded prices
    - Test: politician with 5 eligible trades → result written to DB
    - Test: politician with 2 eligible trades → skipped (below threshold)
    - Test: politician with null-ticker trades → excluded from computation
    - Test: FMP returns null for a ticker → unresolvable counter correct
    - Test: computeAllReturns processes all politicians × 3 windows

  **Must NOT do**:
  - Do NOT call FMP directly — use `getHistoricalPrices()` and `getStockQuote()` from `stock-price-service.ts` (they handle caching)
  - Do NOT process politicians in parallel — sequential to avoid FMP rate limits
  - Do NOT compute returns for politicians with < 3 eligible trades

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core orchestration logic wiring multiple modules, requires careful mocking in tests, critical path component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 1, 2, 3)
  - **Parallel Group**: Wave 2 (can run alongside Tasks 4, 6 after Wave 1 completes)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Tasks 1 (DB table), 2 (midpoint), 3 (portfolio engine)

  **References**:

  **Pattern References**:
  - `src/lib/sync/trade-sync.ts` — Shows the trade sync pipeline pattern: fetch data → process → upsert to Supabase. The computation orchestrator follows the same structure but reads trades FROM Supabase instead of from FMP.
  - `scripts/backfill.ts:21-36, 86-100` — Shows batch processing pattern with progress logging and service client usage

  **API/Type References**:
  - `src/lib/stock-price-service.ts:31-45` (getStockQuote) — Use this for current prices; it handles caching in stock_prices table
  - `src/lib/stock-price-service.ts:74-101` (getHistoricalPrices) — Use this for historical prices; it handles caching and FMP fallback
  - `src/lib/supabase/service.ts:4-12` — createServiceClient() for background job DB access
  - `src/types/database.ts:Trade, Politician` — DB row shapes for queries

  **Test References**:
  - `src/lib/sync/__tests__/trade-sync.test.ts` — Shows how to mock Supabase client and test sync logic
  - `src/lib/fmp/__tests__/client.test.ts` — Shows vi.mock patterns for external service mocking

  **WHY Each Reference Matters**:
  - `trade-sync.ts`: The orchestrator is structurally similar — it coordinates data flow between Supabase and external services. Copy the error handling and logging patterns.
  - `stock-price-service.ts`: You MUST use these functions (not raw FMP calls) because they handle caching. If you call FMP directly, you'll bypass the cache and waste API calls.
  - `backfill.ts`: Shows how to process large batches with progress logging — copy the "processing {n}/{total}" pattern.

  **Acceptance Criteria**:
  - [ ] File created: `src/lib/returns/compute-returns.ts`
  - [ ] Test file created: `src/lib/returns/__tests__/compute-returns.test.ts`
  - [ ] `bun test src/lib/returns/__tests__/compute-returns.test.ts` → PASS (all cases)
  - [ ] `bun test` → PASS (146 + all new tests, 0 failures)
  - [ ] Throttling present: 200ms delay between FMP calls (verifiable in code review)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Orchestrator processes politician with sufficient trades
    Tool: Bash (bun test)
    Preconditions: Mocked Supabase returns politician with 5 trades, mocked prices available
    Steps:
      1. Call computePoliticianReturns(politicianId, 'ytd') with mocked deps
      2. Assert: result.totalTrades === 5
      3. Assert: result.totalReturnPct is a number (not NaN)
      4. Assert: result.deployedCapital > 0
    Expected Result: Valid PortfolioResult with computed return
    Failure Indicators: NaN return, zero deployed capital despite trades existing
    Evidence: .sisyphus/evidence/task-5-orchestrator-happy.txt

  Scenario: Politician below trade threshold skipped
    Tool: Bash (bun test)
    Preconditions: Mocked politician with 2 trades
    Steps:
      1. Call computeAllReturns() with mocked DB containing 1 politician with 2 trades
      2. Assert: politician_returns table NOT written for this politician
      3. Assert: summary.skipped === 1
    Expected Result: Politician skipped, no DB write
    Failure Indicators: Row written to politician_returns, skipped count wrong
    Evidence: .sisyphus/evidence/task-5-orchestrator-threshold.txt

  Scenario: Null ticker trades excluded
    Tool: Bash (bun test)
    Preconditions: Mocked politician with 5 trades, 2 have null tickers
    Steps:
      1. Call computePoliticianReturns()
      2. Assert: result.totalTrades === 3 (only non-null ticker trades counted)
      3. Assert: null-ticker trades not passed to portfolio engine
    Expected Result: Null tickers filtered before computation
    Failure Indicators: totalTrades includes null-ticker trades, error thrown
    Evidence: .sisyphus/evidence/task-5-orchestrator-null-ticker.txt
  ```

  **Commit**: YES (Commit 4)
  - Message: `feat(returns): add computation orchestrator with tests`
  - Files: `src/lib/returns/compute-returns.ts`, `src/lib/returns/__tests__/compute-returns.test.ts`
  - Pre-commit: `bun test`

- [ ] 6. Navigation Updates (Top Nav + Mobile Nav)

  **What to do**:
  - Edit `src/components/nav/top-nav.tsx`:
    - Add `{ href: '/leaderboard', label: 'Leaderboard' }` to the `links` array (around line 11-15)
    - Place it after "Politicians" in the nav order
  - Edit `src/components/nav/mobile-nav.tsx`:
    - Add the same link entry to the mobile nav `links` array (around line 19-23)
  - Verify both nav components render the new link

  **Must NOT do**:
  - Do NOT add any premium badge or lock icon next to the link (leaderboard is public)
  - Do NOT restructure the nav component — just add the link entry

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two 1-line changes to existing files, no logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/nav/top-nav.tsx:11-15` — Existing links array; add new entry following exact same `{ href, label }` shape
  - `src/components/nav/mobile-nav.tsx:19-23` — Mobile links array; same pattern

  **WHY Each Reference Matters**:
  - Both files use a hardcoded `links` array. You must add the entry to BOTH or the link appears on desktop but not mobile (or vice versa).

  **Acceptance Criteria**:
  - [ ] `top-nav.tsx` links array contains `{ href: '/leaderboard', label: 'Leaderboard' }`
  - [ ] `mobile-nav.tsx` links array contains matching entry
  - [ ] `bun test` → PASS (no regression)
  - [ ] `bun run build` → PASS (no type errors)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Desktop nav shows Leaderboard link
    Tool: Playwright
    Preconditions: Dev server running at localhost:3000
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Find nav element containing links
      3. Assert: link with text "Leaderboard" exists
      4. Assert: link href is "/leaderboard"
      5. Click the Leaderboard link
      6. Assert: URL is now /leaderboard
    Expected Result: Leaderboard link visible, clickable, navigates correctly
    Failure Indicators: Link missing, wrong href, 404 on click
    Evidence: .sisyphus/evidence/task-6-nav-desktop.png

  Scenario: Mobile nav shows Leaderboard link
    Tool: Playwright
    Preconditions: Dev server running, viewport set to 375x667 (mobile)
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Open mobile nav menu (hamburger button)
      3. Assert: link with text "Leaderboard" exists in mobile menu
      4. Click it
      5. Assert: URL is /leaderboard
    Expected Result: Mobile nav includes Leaderboard link
    Failure Indicators: Link missing from mobile menu
    Evidence: .sisyphus/evidence/task-6-nav-mobile.png
  ```

  **Commit**: YES (groups with Commit 6)
  - Message: `feat(ui): add leaderboard page + navigation`
  - Files: `src/components/nav/top-nav.tsx`, `src/components/nav/mobile-nav.tsx`
  - Pre-commit: `bun test`

- [ ] 7. Cron Route + Vercel Configuration

  **What to do**:
  - Create `src/app/api/cron/compute-returns/route.ts`:
    - Follow the structure from `src/app/api/cron/sync-trades/route.ts` BUT use **GET** (not POST):
      - `export const runtime = 'nodejs'`
      - `export const maxDuration = 300` (5 minutes — computation may take a while)
      - **`export async function GET(request: Request)`** — Vercel cron sends GET requests per official docs: "To trigger a cron job, Vercel makes an HTTP GET request"
      - Check `Authorization` header against `CRON_SECRET` environment variable (same pattern as sync-trades)
      - If valid, call `computeAllReturns()` from `src/lib/returns/compute-returns.ts`
      - Return JSON with result summary
      - If invalid auth, return 401
    - **Note**: The existing `sync-trades/route.ts` uses POST, which means Vercel cron may not be triggering it correctly (pre-existing issue, out of scope for this plan). The NEW compute-returns route uses GET as per Vercel docs.
  - Update `vercel.json` to add a monthly cron entry:
    ```json
    {
      "crons": [
        { "path": "/api/cron/sync-trades", "schedule": "0 0 * * *" },
        { "path": "/api/cron/compute-returns", "schedule": "0 2 1 * *" }
      ]
    }
    ```
    (Runs at 2 AM UTC on the 1st of every month — after daily sync completes)

  **Must NOT do**:
  - Do NOT modify the existing sync-trades cron entry
  - Do NOT remove or change the daily schedule
  - Do NOT set maxDuration below 300 (computation needs time for FMP calls)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Short route file following exact existing pattern + small vercel.json update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: Task 9
  - **Blocked By**: Task 5 (needs computeAllReturns to import)

  **References**:

  **Pattern References**:
  - `src/app/api/cron/sync-trades/route.ts:1-19` — Structure pattern to follow: runtime export, CRON_SECRET check, handler shape. **IMPORTANT**: sync-trades uses `POST` but Vercel cron sends `GET` — copy the auth/structure pattern but change the exported function name from `POST` to `GET`.
  - `vercel.json:1-7` — Current cron configuration; add new entry to existing crons array

  **WHY Each Reference Matters**:
  - `sync-trades/route.ts`: Copy the auth pattern (`isAuthorized()` checking Bearer token) and error handling. Change `export async function POST` to `export async function GET` since Vercel cron dispatches GET requests.
  - `vercel.json`: Must preserve existing cron entry while adding new one. Wrong JSON structure breaks both crons.

  **Acceptance Criteria**:
  - [ ] File created: `src/app/api/cron/compute-returns/route.ts`
  - [ ] `vercel.json` contains both cron entries (sync-trades daily + compute-returns monthly)
  - [ ] `bun test` → PASS (no regression)
  - [ ] `bun run build` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Cron endpoint rejects unauthorized request
    Tool: Bash (curl)
    Preconditions: Dev server running at localhost:3000
    Steps:
      1. curl -X GET http://localhost:3000/api/cron/compute-returns (no auth header)
      2. Assert: HTTP 401
      3. Assert response body contains "Unauthorized"
    Expected Result: 401 Unauthorized
    Failure Indicators: 200 response, computation triggered
    Evidence: .sisyphus/evidence/task-7-cron-unauth.txt

  Scenario: Cron endpoint accepts valid CRON_SECRET
    Tool: Bash (curl)
    Preconditions: Dev server running with CRON_SECRET env var set
    Steps:
      1. curl -X GET http://localhost:3000/api/cron/compute-returns -H "Authorization: Bearer $CRON_SECRET"
      2. Assert: HTTP 200
      3. Assert response body contains "processed" field
    Expected Result: 200 with computation summary
    Failure Indicators: 401/500, missing summary
    Evidence: .sisyphus/evidence/task-7-cron-success.txt

  Scenario: vercel.json has both cron entries
    Tool: Bash (cat + jq)
    Preconditions: vercel.json updated
    Steps:
      1. Read vercel.json
      2. Assert: .crons array has 2 entries
      3. Assert: entry with path "/api/cron/sync-trades" and schedule "0 0 * * *"
      4. Assert: entry with path "/api/cron/compute-returns" and schedule "0 2 1 * *"
    Expected Result: Both cron entries present with correct schedules
    Failure Indicators: Missing entry, wrong path, wrong schedule
    Evidence: .sisyphus/evidence/task-7-vercel-json.txt
  ```

  **Commit**: YES (Commit 5)
  - Message: `feat(api): add returns computation cron + admin trigger endpoints`
  - Files: `src/app/api/cron/compute-returns/route.ts`, `vercel.json`
  - Pre-commit: `bun test`

- [ ] 8. Leaderboard Page (Server Component)

  **What to do**:
  - Create `src/app/(app)/leaderboard/page.tsx` as a server component:
    - `export default async function LeaderboardPage({ searchParams })`
    - Accept optional searchParams: `window` ('ytd' | 'l12m' | 'l5y', default 'ytd'), `chamber` ('senate' | 'house' | undefined), `party` ('Democrat' | 'Republican' | undefined), `page` (number, default 1)
    - Use `createClient()` from `src/lib/supabase/server.ts`
    - Query `politician_returns` table joined with `politicians` table:
      ```
      supabase
        .from('politician_returns')
        .select('*, politicians!inner(full_name, party, state, chamber)')
        .eq('time_window', window)
        .order('total_return_pct', { ascending: false })
      ```
    - Apply optional filters: `.eq('politicians.chamber', chamber)`, `.eq('politicians.party', party)`
    - Paginate: 25 per page using `.range(offset, offset + 24)`
    - Display:
      - Page title: "Leaderboard" with a subtitle "Congressional trading returns"
      - **Tab-based window selector** (NOT 3 simultaneous columns): 3 tabs for YTD / L12M / 5Y implemented as `<a>` links to `?window=ytd`, `?window=l12m`, `?window=l5y`. Default: `ytd`. Active tab visually highlighted. Each tab shows ONE "Return %" column — the all-time return for politicians who qualify under that window's eligibility threshold.
      - Optional filter dropdowns for Chamber and Party
      - Table/card grid showing (for the SELECTED window only):
        - Rank (#)
        - Politician name (link to `/politicians/{id}`)
        - Party + State badge
        - Chamber badge
        - Return % (single column, formatted: +15.23% in green, -5.67% in red)
        - Total trades count (in-window trades only)
        - Open/closed positions
      - Pagination controls at bottom (25 per page)
      - "Last updated" timestamp from `computed_at` field (formatted: "Returns computed on Mar 15, 2026")
      - Methodology disclaimer tooltip: "Returns are estimated based on disclosed trade ranges and historical stock prices. Actual returns may differ."
    - Empty state: if no data in `politician_returns` table, show: "Returns have not been computed yet. Check back after the next monthly computation."
    - Export metadata for Next.js:
      ```typescript
      export const metadata = {
        title: 'Leaderboard | CapitolTrades',
        description: 'Congressional trading returns leaderboard — YTD, L12M, and 5Y performance'
      };
      ```

  **Must NOT do**:
  - Do NOT make this a client component — follow server component pattern
  - Do NOT add premium gating on the leaderboard page (it's public)
  - Do NOT add sorting by columns other than return % for the selected time window
  - Do NOT add a methodology page — just the tooltip disclaimer
  - Do NOT call FMP or compute returns on page load — only read from `politician_returns`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server component with data fetching, filtering, pagination, and UI rendering — moderate complexity, follows existing patterns closely
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1 (needs DB table types), Task 6 (nav link should exist)

  **References**:

  **Pattern References**:
  - `src/app/(app)/politicians/page.tsx:70-166` — PRIMARY pattern: server component structure, createClient(), Supabase query with filters/sorting, mapping DB rows to UI, empty state rendering. Copy this file's structure almost exactly.
  - `src/app/(app)/dashboard/page.tsx:70-156` — Secondary pattern: pagination with `.range()`, premium gating check (skip the gating but copy the pagination), conditional messaging

  **API/Type References**:
  - `src/types/database.ts:PoliticianReturn` (added in Task 1) — Type for `politician_returns` rows
  - `src/types/database.ts:Politician` — Type for joined politician data (full_name, party, state, chamber)

  **External References**:
  - Tailwind CSS: color utilities `text-green-600` for positive returns, `text-red-600` for negative

  **WHY Each Reference Matters**:
  - `politicians/page.tsx`: This is the closest existing page to what the leaderboard will be — a list page with filters and cards/rows. Copy the structure: async function → createClient → query → map → render.
  - `dashboard/page.tsx`: Shows pagination pattern with `.range()` that the leaderboard needs for 25-per-page results.

  **Acceptance Criteria**:
  - [ ] File created: `src/app/(app)/leaderboard/page.tsx`
  - [ ] Page is a server component (async default export)
  - [ ] `bun run build` → PASS (page compiles without errors)
  - [ ] `curl http://localhost:3000/leaderboard` → 200
  - [ ] Page displays "Last updated" timestamp
  - [ ] Page shows methodology disclaimer
  - [ ] Time window tabs work: `?window=ytd`, `?window=l12m`, `?window=l5y`
  - [ ] Empty state shows when no data computed yet

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Leaderboard page loads with data
    Tool: Playwright
    Preconditions: Dev server running, politician_returns table has computed data (from Task 9)
    Steps:
      1. Navigate to http://localhost:3000/leaderboard
      2. Assert: page title contains "Leaderboard"
      3. Assert: table/grid with politician names is visible
      4. Assert: return percentages displayed (e.g., text matching /[+-]?\d+\.\d+%/)
      5. Assert: "Last updated" or "computed on" text visible
      6. Screenshot the page
    Expected Result: Leaderboard renders with politician return data, formatted percentages
    Failure Indicators: 404, empty page despite data existing, unformatted numbers
    Evidence: .sisyphus/evidence/task-8-leaderboard-loaded.png

  Scenario: Time window switching
    Tool: Playwright
    Preconditions: Leaderboard page with data
    Steps:
      1. Navigate to http://localhost:3000/leaderboard (default: YTD)
      2. Assert: YTD tab/button is active/highlighted
      3. Click "L12M" tab
      4. Assert: URL contains ?window=l12m
      5. Assert: data refreshes (different return values possible)
      6. Click "5Y" tab
      7. Assert: URL contains ?window=l5y
    Expected Result: Window tabs switch correctly, URL updates, data refreshes
    Failure Indicators: Tabs don't work, URL doesn't change, same data for all windows
    Evidence: .sisyphus/evidence/task-8-leaderboard-windows.png

  Scenario: Empty state when no data computed
    Tool: Playwright
    Preconditions: politician_returns table is empty
    Steps:
      1. Navigate to http://localhost:3000/leaderboard
      2. Assert: empty state message visible (text containing "not been computed" or similar)
      3. Assert: no table/grid rendered
    Expected Result: Friendly empty state message displayed
    Failure Indicators: Error page, blank page, broken layout
    Evidence: .sisyphus/evidence/task-8-leaderboard-empty.png

  Scenario: Chamber/party filtering
    Tool: Playwright
    Preconditions: Leaderboard with data from both chambers
    Steps:
      1. Navigate to http://localhost:3000/leaderboard
      2. Select "Senate" chamber filter
      3. Assert: only senators displayed (check party/state badges)
      4. Select "Republican" party filter
      5. Assert: only Republican senators displayed
    Expected Result: Filters narrow results correctly
    Failure Indicators: Filters don't work, wrong politicians shown
    Evidence: .sisyphus/evidence/task-8-leaderboard-filters.png
  ```

  **Commit**: YES (Commit 6)
  - Message: `feat(ui): add leaderboard page + navigation`
  - Files: `src/app/(app)/leaderboard/page.tsx`
  - Pre-commit: `bun test && bun run build`

- [ ] 9. Initial Data Seed + End-to-End Validation

  **What to do**:
  - Run the computation orchestrator against the LIVE database to seed initial returns data:
    - Either trigger via admin endpoint (Task 4) or run directly via a script
    - Create a temporary script `scripts/compute-returns.ts` (can be deleted after initial run):
      ```typescript
      import { computeAllReturns } from '../src/lib/returns/compute-returns';
      const result = await computeAllReturns();
      console.log('Computation complete:', result);
      ```
    - Execute: `bun run scripts/compute-returns.ts`
    - Monitor progress and verify completion
  - After computation completes:
    - Verify `politician_returns` table has data: `SELECT count(*) FROM politician_returns` should be > 0
    - Verify data quality: `SELECT time_window, count(*), avg(total_return_pct) FROM politician_returns GROUP BY time_window`
    - Verify leaderboard page shows data: navigate to `/leaderboard` and confirm politicians are displayed
  - Run full E2E validation:
    - All existing tests pass: `bun test`
    - Build succeeds: `bun run build`
    - Leaderboard accessible without auth
    - Time window switching works
    - Data looks reasonable (no 999999% returns, no NaN values)

  **Must NOT do**:
  - Do NOT run computation against production with debug logging enabled
  - Do NOT run more than one computation at a time (would duplicate data)
  - Do NOT skip data quality checks

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Orchestrating live computation, monitoring progress, validating data quality across multiple dimensions — requires careful execution and judgment
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Tasks 5, 7, 8)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 5, 7, 8

  **References**:

  **Pattern References**:
  - `scripts/backfill.ts` — Batch script execution pattern: how to run a TypeScript script with bun that uses service client and logs progress

  **WHY Each Reference Matters**:
  - `backfill.ts`: Shows the pattern for running a long computation script against the live DB — service client setup, progress logging, error handling

  **Acceptance Criteria**:
  - [ ] `politician_returns` table contains data for all 3 windows
  - [ ] `SELECT count(*) FROM politician_returns WHERE time_window = 'ytd'` > 0
  - [ ] `SELECT count(*) FROM politician_returns WHERE time_window = 'l12m'` > 0
  - [ ] `SELECT count(*) FROM politician_returns WHERE time_window = 'l5y'` > 0
  - [ ] No NaN or NULL total_return_pct values: `SELECT count(*) FROM politician_returns WHERE total_return_pct IS NULL` = 0
  - [ ] No extreme outliers: `SELECT count(*) FROM politician_returns WHERE abs(total_return_pct) > 1000` should be very small or 0
  - [ ] `bun test` → PASS (all tests)
  - [ ] `bun run build` → PASS
  - [ ] Leaderboard page at `/leaderboard` loads with politician data

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full E2E — leaderboard loads with computed data
    Tool: Playwright
    Preconditions: Computation completed, dev server running
    Steps:
      1. Navigate to http://localhost:3000/leaderboard
      2. Assert: page loads without error (HTTP 200)
      3. Assert: at least 5 politician entries visible
      4. Assert: each entry shows a return percentage (matches /[+-]?\d+\.\d+%/)
      5. Assert: entries are sorted by return (first entry has highest return)
      6. Assert: "Last updated" or "computed on" timestamp visible and recent
      7. Switch to L12M tab
      8. Assert: data changes (or stays same if returns are similar)
      9. Screenshot YTD and L12M views
    Expected Result: Leaderboard fully functional with real computed data
    Failure Indicators: Empty page, NaN percentages, unsorted data
    Evidence: .sisyphus/evidence/task-9-e2e-leaderboard-ytd.png, .sisyphus/evidence/task-9-e2e-leaderboard-l12m.png

  Scenario: Data quality check
    Tool: Bash (Supabase MCP or curl)
    Preconditions: Computation completed
    Steps:
      1. Query: SELECT time_window, count(*) as ct, round(avg(total_return_pct)::numeric, 2) as avg_return, round(min(total_return_pct)::numeric, 2) as min_return, round(max(total_return_pct)::numeric, 2) as max_return FROM politician_returns GROUP BY time_window ORDER BY time_window
      2. Assert: 3 rows (l12m, l5y, ytd)
      3. Assert: all count > 0
      4. Assert: avg_return is between -100 and 500 (reasonable range)
      5. Assert: no NULL values in return columns
    Expected Result: Data across all 3 windows, reasonable return ranges
    Failure Indicators: Missing windows, extreme outliers, NaN/NULL values
    Evidence: .sisyphus/evidence/task-9-data-quality.txt

  Scenario: Computation summary validation
    Tool: Bash
    Preconditions: Script output captured
    Steps:
      1. Verify computation script output shows: processed > 0, errors = 0 or very small
      2. Verify no unhandled exceptions in output
    Expected Result: Clean computation with minimal errors
    Failure Indicators: High error count, exceptions
    Evidence: .sisyphus/evidence/task-9-computation-summary.txt
  ```

  **Commit**: YES (Commit 6 — groups with page + nav)
  - Message: `feat(ui): add leaderboard page + navigation`
  - Files: `scripts/compute-returns.ts` (temporary)
  - Pre-commit: `bun test && bun run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (leaderboard loads, cron computes, nav links work). Test edge cases: empty state, no data, mobile nav. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `feat(db): add politician_returns table migration + types` | `supabase/migrations/004_politician_returns.sql`, `src/types/database.ts` | `bun test` |
| 2 | `feat(returns): add midpoint amount utility with tests` | `src/lib/returns/midpoint.ts`, `src/lib/returns/__tests__/midpoint.test.ts` | `bun test` |
| 3 | `feat(returns): add portfolio reconstruction engine with tests` | `src/lib/returns/portfolio-engine.ts`, `src/lib/returns/__tests__/portfolio-engine.test.ts` | `bun test` |
| 4 | `feat(returns): add computation orchestrator with tests` | `src/lib/returns/compute-returns.ts`, `src/lib/returns/__tests__/compute-returns.test.ts` | `bun test` |
| 5 | `feat(api): add returns computation cron + admin trigger endpoints` | `src/app/api/cron/compute-returns/route.ts`, `src/app/api/admin/trigger-compute/route.ts`, `vercel.json` | `bun test` |
| 6 | `feat(ui): add leaderboard page + navigation` | `src/app/(app)/leaderboard/page.tsx`, `src/components/nav/top-nav.tsx`, `src/components/nav/mobile-nav.tsx` | `bun test && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
bun test                    # Expected: All tests pass (146 existing + ~30 new)
bun run build               # Expected: Clean build, no errors
curl http://localhost:3000/leaderboard  # Expected: 200, HTML with politician return data
curl http://localhost:3000/api/cron/compute-returns -H "Authorization: Bearer $CRON_SECRET"  # Expected: 200 (GET — matches Vercel cron)
```

### Final Checklist
- [ ] All "Must Have" items present and verified
- [ ] All "Must NOT Have" items absent (grep confirmed)
- [ ] All existing 146 tests still pass
- [ ] New tests for midpoint, portfolio-engine, and compute-returns pass
- [ ] Leaderboard page renders with tab-based UI (YTD/L12M/5Y tabs) showing politicians sorted by return %
- [ ] Navigation updated in both desktop and mobile views
- [ ] Monthly cron job configured in vercel.json
- [ ] "Last updated" timestamp displayed on leaderboard
