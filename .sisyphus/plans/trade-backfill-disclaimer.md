# Trade Data Backfill + Leaderboard Disclaimer

## TL;DR

> **Quick Summary**: Fix inaccurate leaderboard returns by backfilling all historical FMP trade data (~15,000-17,000 trades vs current 5,084), filtering stock options from return calculations, and adding a comprehensive disclaimer to the leaderboard page.
> 
> **Deliverables**:
> - Enhanced `scripts/backfill.ts` with rate-limiting delay and progress logging
> - `asset_type` filter in `normalizeTrade()` to skip stock options/calls/puts
> - Expanded leaderboard disclaimer covering data limitations
> - Tests for both changes
> - Manual execution: full backfill + return recomputation
> 
> **Estimated Effort**: Short (3-4 tasks, ~30 min code + ~30 min backfill runtime)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 + Task 2 (parallel) → Task 3 → Task 4 (manual backfill) → Task 5 (recompute) → F1-F4

---

## Context

### Original Request
User discovered Nancy Pelosi showed -6.32% returns on the leaderboard despite publicly known stellar performance (54% in 2024). Investigation revealed three root causes: (1) the sync only fetches page 0 from FMP (~100 latest trades across ALL politicians), missing ~10,000-12,000 older trades; (2) stock options (calls/puts) are treated as regular stock purchases, causing wrong share calculations; (3) sells without matching buys produce artificial losses.

### Interview Summary
**Key Discussions**:
- **Backfill scope**: User chose "Full deep backfill" — all ~170 FMP pages (House ~120 + Senate ~50)
- **Options handling**: User chose "Treat stock options as regular stock purchases" with disclaimer — meaning we SKIP them from return calculations entirely rather than modeling option pricing
- **Test strategy**: User chose "Tests after implementation"
- **Existing infrastructure**: `scripts/backfill.ts` already exists with pagination — just needs inter-page delay and progress logging

**Research Findings**:
- DB has 5,084 trades, FMP has ~15,000-17,000 available
- Only 23/115 politicians have ANY trades in DB
- Pelosi has 19 trades in DB vs 30 in FMP (11 missing, spanning Dec 2024 – Jun 2025)
- 13 of Pelosi's 30 FMP trades are "Stock Option" (call options)
- Existing `scripts/backfill.ts` already paginates through all pages — needs only minor enhancements

### Metis Review
**Identified Gaps** (addressed):
- **No inter-page delay**: Could trigger 429 rate limits over ~170 pages → Added 300ms delay requirement
- **`asset_type` ignored by `normalizeTrade()`**: Options get wrong share calcs → Added filter to skip options
- **Silent error swallowing**: `syncTradeBatch` treats duplicates and errors identically → Noted but NOT in scope (Metis directive: do NOT modify `syncTradeBatch`)
- **Per-record DB calls**: ~34,000 sequential calls for full backfill → Acceptable for one-time operation (~28 min)

---

## Work Objectives

### Core Objective
Fix leaderboard return accuracy by completing the historical trade dataset and excluding unmodelable asset types from return calculations.

### Concrete Deliverables
- Modified `scripts/backfill.ts` — 300ms inter-page delay + page-level progress logging
- Modified `src/lib/returns/compute-returns.ts` — `asset_type` filter in `normalizeTrade()` (~3 lines)
- Modified `src/app/(app)/leaderboard/page.tsx` — expanded disclaimer text
- Modified `scripts/backfill.test.ts` — test for delay behavior
- Modified `src/lib/returns/__tests__/compute-returns.test.ts` — tests for `asset_type` filter
- Executed: `bun scripts/backfill.ts` (full historical backfill)
- Executed: `bun scripts/compute-returns.ts` (recompute all returns with new data + filter)

### Definition of Done
- [ ] `bun run test` passes (all existing 182 tests + new tests)
- [ ] `bun run build` succeeds with no errors
- [ ] Full backfill completed (`status: 'completed'` in output)
- [ ] Returns recomputed with significantly more `processed` count (was 164)
- [ ] Pelosi's return is positive (or at minimum, more accurate than -6.32%)
- [ ] Leaderboard page shows expanded disclaimer

### Must Have
- 300ms delay between FMP API pages in backfill script
- `normalizeTrade()` must return `null` for trades where `asset_type` matches `/option|call|put/i`
- Disclaimer must mention: (a) returns are estimates, (b) stock options are excluded, (c) based on congressional disclosure data
- All existing tests continue to pass

### Must NOT Have (Guardrails)
- **Do NOT modify DB schema** — no migrations, no new tables, no column changes
- **Do NOT modify `portfolio-engine.ts`** — the portfolio reconstruction engine is tested and correct
- **Do NOT modify `syncTradeBatch()` in `trade-sync.ts`** — error handling changes are out of scope
- **Do NOT modify the FMP client** (`src/lib/fmp/client.ts`) — endpoints and fetching are correct
- **Do NOT modify the cron sync route** — page 0 is sufficient for daily incremental sync
- **Do NOT add batched inserts** — per-record is acceptable for one-time backfill
- **Do NOT add options pricing logic** — we skip options, not price them
- **Do NOT add multi-page support to cron sync** — backfill script handles historical catch-up separately
- **Do NOT over-comment code** — minimal inline comments only where logic is non-obvious
- **Do NOT add JSDoc to every function** — existing codebase has minimal JSDoc; match the style

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES — tests after implementation
- **Framework**: Vitest (run via `bun run test`)
- **Test commands**: `bun run test` (all tests), `bun run build` (type-check + build)

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Script changes**: Use Bash — run tests, verify output
- **UI changes**: Use Bash — run build, check for errors
- **Manual execution tasks**: Use Bash — run scripts, capture output, verify results

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — code changes, MAX PARALLEL):
├── Task 1: Add asset_type filter to normalizeTrade() + tests [quick]
├── Task 2: Add inter-page delay to backfill script + tests [quick]
└── Task 3: Expand leaderboard disclaimer [quick]

Wave 2 (After Wave 1 — manual execution, SEQUENTIAL):
├── Task 4: Run full backfill (bun scripts/backfill.ts) [unspecified-high]
└── Task 5: Recompute returns (bun scripts/compute-returns.ts) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1    | —         | 4, 5   |
| 2    | —         | 4      |
| 3    | —         | —      |
| 4    | 1, 2      | 5      |
| 5    | 1, 4      | F1-F4  |

Critical Path: Task 1 → Task 4 → Task 5 → F1-F4 → user okay
Parallel Speedup: Wave 1 runs 3 tasks simultaneously
Max Concurrent: 3 (Wave 1)

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **2** — T4 → `unspecified-high`, T5 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Add `asset_type` filter to `normalizeTrade()` + tests

  **What to do**:
  - In `src/lib/returns/compute-returns.ts`, modify the `normalizeTrade()` function (lines 45-63) to check the trade's `asset_type` field
  - After the existing `if (!trade.ticker)` check (line 46), add a new guard: if `trade.asset_type` matches the regex `/option|call|put/i`, return `null`
  - This skips stock options, call options, and put options from return calculations entirely
  - The `Trade` type already has `asset_type: string | null` (see `src/types/database.ts:43`), so no type changes needed
  - In `src/lib/returns/__tests__/compute-returns.test.ts`, add 2 new test cases to the `computePoliticianReturns` describe block:
    - Test 1: "excludes stock option trades from computation" — create trades where some have `asset_type: "Stock Option"`, verify they are excluded from `totalTrades` count
    - Test 2: "includes regular stock trades when asset_type is Stock or null" — verify trades with `asset_type: "Stock"` and `asset_type: null` are still included

  **Must NOT do**:
  - Do NOT modify `portfolio-engine.ts` — the filter goes in `normalizeTrade()` only
  - Do NOT add options pricing logic — we skip options, not price them
  - Do NOT change the function signature of `normalizeTrade()`
  - Do NOT add more than ~3 lines to the filter logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single function edit (~3 lines) + 2 straightforward test cases. No complexity.
  - **Skills**: `[]`
    - No specialized skills needed for a simple filter addition
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5 (backfill needs correct filter before recompute)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `src/lib/returns/compute-returns.ts:45-63` — The `normalizeTrade()` function. Lines 46-48 show the existing null-ticker guard pattern. Add the new `asset_type` guard immediately after it (after line 48, before line 50). Follow the same `if (condition) { return null; }` pattern.
  - `src/lib/returns/compute-returns.ts:50-53` — The existing `transactionType` guard shows how to filter and return null. Your new guard should sit between the ticker check and the transactionType check.

  **API/Type References** (contracts to implement against):
  - `src/types/database.ts:43` — `asset_type: string | null` on the `Trade` type. Values in the FMP data include: `"Stock"`, `"Stock Option"`, `"Corporate Bond"`, `"Other Securities"`, `null`. You're filtering out any value matching `/option|call|put/i`.

  **Test References** (testing patterns to follow):
  - `src/lib/returns/__tests__/compute-returns.test.ts:163-190` — The "excludes null ticker trades" test shows exactly how to test `normalizeTrade()` filtering: create trades with the target field value, call `computePoliticianReturns`, and assert `totalTrades` excludes them. Copy this pattern.
  - `src/lib/returns/__tests__/compute-returns.test.ts:34-53` — The `makeTrade()` helper already accepts `asset_type` as an override (line 44: `asset_type: overrides.asset_type ?? "Stock"`). Use `makeTrade({ asset_type: "Stock Option" })` in your tests.

  **WHY Each Reference Matters**:
  - `normalizeTrade()` is the single gatekeeper for which trades enter the portfolio engine — adding the filter here means ALL downstream computation automatically excludes options
  - The `makeTrade()` helper already defaults `asset_type` to `"Stock"`, so existing tests won't break — only explicitly option-typed trades will be filtered

  **Acceptance Criteria**:

  - [ ] `bun run test src/lib/returns/__tests__/compute-returns.test.ts` → PASS (existing 5 tests + 2 new = 7 tests, 0 failures)
  - [ ] `bun run build` → succeeds with no type errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Stock option trades are excluded from return computation
    Tool: Bash (bun run test)
    Preconditions: New test exists in compute-returns.test.ts
    Steps:
      1. Run `bun run test src/lib/returns/__tests__/compute-returns.test.ts`
      2. Check output for test "excludes stock option trades from computation"
      3. Verify test passes — totalTrades count excludes option trades
    Expected Result: Test passes. If 5 trades provided and 2 are "Stock Option", totalTrades = 3.
    Failure Indicators: Test fails, totalTrades includes option trades, or test file has syntax errors
    Evidence: .sisyphus/evidence/task-1-option-filter-test.txt

  Scenario: Regular stock trades (asset_type: "Stock" or null) still included
    Tool: Bash (bun run test)
    Preconditions: New test exists in compute-returns.test.ts
    Steps:
      1. Run `bun run test src/lib/returns/__tests__/compute-returns.test.ts`
      2. Check output for test "includes regular stock trades when asset_type is Stock or null"
      3. Verify test passes — trades with asset_type "Stock" and null are counted
    Expected Result: Test passes. All non-option trades are included in totalTrades.
    Failure Indicators: Test fails, valid trades are incorrectly filtered out
    Evidence: .sisyphus/evidence/task-1-stock-inclusion-test.txt

  Scenario: All existing tests still pass (no regression)
    Tool: Bash (bun run test)
    Preconditions: None
    Steps:
      1. Run `bun run test`
      2. Verify all tests pass (182 existing + 2 new = 184 total)
    Expected Result: 184 tests pass, 0 failures
    Failure Indicators: Any existing test fails
    Evidence: .sisyphus/evidence/task-1-full-test-suite.txt
  ```

  **Commit**: YES
  - Message: `fix(returns): filter stock options from return calculations`
  - Files: `src/lib/returns/compute-returns.ts`, `src/lib/returns/__tests__/compute-returns.test.ts`
  - Pre-commit: `bun run test`

- [ ] 2. Add inter-page delay to backfill script + tests

  **What to do**:
  - In `scripts/backfill.ts`, add a 300ms delay between pages in the `runSourceBackfill()` function
  - After the `page += 1` line (line 61), add: `await new Promise(resolve => setTimeout(resolve, 300))`
  - Make the delay injectable for testing: add a `delay?: number` field to `BackfillOptions` (line 9), default to 300, and pass it through to `runSourceBackfill()`
  - Add a cumulative progress log line at the end of each source in `runBackfill()`: log total trades fetched/inserted/skipped after each source completes (after line 114)
  - In `scripts/backfill.test.ts`, add a test: "waits between pages to avoid rate limiting" — mock `fetchPage` to return data for 2 pages then empty, verify that execution takes at minimum some delay (or better: use `vi.useFakeTimers()` to verify `setTimeout` is called with 300)

  **Must NOT do**:
  - Do NOT modify `syncTradeBatch()` in `trade-sync.ts` — only modify the backfill script
  - Do NOT add batched inserts — per-record is fine for one-time backfill
  - Do NOT add retry logic for 429s — the delay should prevent them; if they still occur, that's a separate concern
  - Do NOT make delay configurable via env var — a simple constructor parameter is sufficient

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding ~5 lines to an existing script + 1 test case. Straightforward.
  - **Skills**: `[]`
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4 (backfill execution needs the delay to avoid rate limits)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `scripts/backfill.ts:21-70` — The `runSourceBackfill()` function. The `while (true)` loop (line 40) fetches pages sequentially. Add the delay after `page += 1` (line 61), before the next iteration. This ensures a 300ms pause between each FMP API call.
  - `scripts/backfill.ts:9-14` — The `BackfillOptions` type. Add `delay?: number` here. This keeps the delay injectable for testing (pass `delay: 0` in tests for speed).
  - `scripts/backfill.ts:72-164` — The `runBackfill()` function. It iterates over `['senate', 'house']` (line 102) and passes options to `runSourceBackfill`. Thread the `delay` option through.
  - `scripts/backfill.ts:57-59` — Existing per-page log message. This is already good. Add a cumulative summary log after each source completes (after line 114, inside the for loop).

  **Test References** (testing patterns to follow):
  - `scripts/backfill.test.ts:38-77` — The existing test "stops pagination after an empty page" shows the exact mocking pattern: `fetchPage` returns data then empty array, `processBatch` returns counts. Copy this pattern and add timing/delay assertions.
  - `scripts/backfill.test.ts:43-49` — The `fetchPage` mock setup. Reuse this pattern for the delay test.

  **WHY Each Reference Matters**:
  - The backfill will hit ~170 FMP pages. Without delay, requests fire as fast as Node can process them, risking 429 rate limit responses. 300ms × 170 pages = ~51 seconds of delay overhead — negligible compared to the ~28 min total runtime.
  - Making delay injectable via `BackfillOptions` means tests can set `delay: 0` to run instantly while production uses 300ms.

  **Acceptance Criteria**:

  - [ ] `bun run test scripts/backfill.test.ts` → PASS (existing 1 test + 1 new = 2 tests, 0 failures)
  - [ ] `bun run build` → succeeds with no type errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Backfill script includes delay between pages
    Tool: Bash (bun run test)
    Preconditions: New test exists in backfill.test.ts
    Steps:
      1. Run `bun run test scripts/backfill.test.ts`
      2. Check output for test "waits between pages to avoid rate limiting"
      3. Verify test passes — delay is called between page fetches
    Expected Result: 2 tests pass, 0 failures
    Failure Indicators: Test fails or delay is not invoked between pages
    Evidence: .sisyphus/evidence/task-2-delay-test.txt

  Scenario: Existing backfill test still passes (no regression)
    Tool: Bash (bun run test)
    Preconditions: None
    Steps:
      1. Run `bun run test scripts/backfill.test.ts`
      2. Verify "stops pagination after an empty page and aggregates counts" still passes
    Expected Result: Test passes with same assertions as before
    Failure Indicators: Existing test fails due to new delay parameter
    Evidence: .sisyphus/evidence/task-2-regression-test.txt
  ```

  **Commit**: YES
  - Message: `fix(backfill): add 300ms inter-page delay to prevent rate limiting`
  - Files: `scripts/backfill.ts`, `scripts/backfill.test.ts`
  - Pre-commit: `bun run test`

- [ ] 4. Run full historical backfill

  **What to do**:
  - Execute `bun scripts/backfill.ts` from the project root
  - This will paginate through ALL FMP pages: ~120 House pages + ~50 Senate pages
  - Expected runtime: ~25-30 minutes (due to per-record DB inserts + 300ms inter-page delay)
  - Monitor the output for progress logs (page-by-page counts)
  - Expected outcome: `status: 'completed'` with ~10,000-12,000 new `tradesInserted`
  - If the script fails partway, it's safe to re-run — duplicates are handled by `syncTradeBatch` (skipped, not errored)
  - After completion, verify the total trade count in DB increased significantly from 5,084

  **Must NOT do**:
  - Do NOT run this before Tasks 1 and 2 are complete — the delay prevents rate limiting and the filter is needed before recompute
  - Do NOT modify any code during this task — it's execution only
  - Do NOT interrupt the script mid-run unless errors appear

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Long-running script execution (~25-30 min) requiring monitoring and error handling
  - **Skills**: `[]`
    - No specialized skills needed — just running a bun script
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 — Sequential
  - **Blocks**: Task 5 (recompute needs complete trade data)
  - **Blocked By**: Tasks 1, 2 (needs asset_type filter + delay in place)

  **References** (CRITICAL):

  **Pattern References**:
  - `scripts/backfill.ts:170-176` — The direct-run block. When run via `bun scripts/backfill.ts`, it calls `runBackfill()` and sets exit code 1 on failure. Watch for non-zero exit.
  - `scripts/backfill.ts:57-59` — Per-page log format: `Fetched {source} page {page}, inserted {N} trades, skipped {N} duplicates`. You'll see ~170 of these lines.

  **WHY Each Reference Matters**:
  - The direct-run block tells you the script self-reports success/failure via exit code
  - The log format tells you what to expect in the output — if you see pages with 0 inserted and many skipped, that's normal for data that's already in the DB

  **Acceptance Criteria**:

  - [ ] Script output shows `status: 'completed'`
  - [ ] Script exit code is 0 (success)
  - [ ] `tradesInserted` count is > 5,000 (significant new data)
  - [ ] No 429 rate limit errors in output

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full backfill completes successfully
    Tool: Bash (bun scripts/backfill.ts)
    Preconditions: Tasks 1 and 2 are complete. .env.local has FMP_API_KEY and Supabase credentials.
    Steps:
      1. Run `bun scripts/backfill.ts` and capture full output
      2. Wait for script to complete (~25-30 minutes)
      3. Check exit code: `echo $?` should be 0
      4. Check output for `status: 'completed'`
      5. Check output for `tradesInserted` count
    Expected Result: Script completes with status 'completed', tradesInserted > 5000, exit code 0
    Failure Indicators: Script crashes, exit code 1, 429 errors in output, status 'failed'
    Evidence: .sisyphus/evidence/task-4-backfill-output.txt

  Scenario: No rate limit errors during backfill
    Tool: Bash (grep on output)
    Preconditions: Backfill output captured to evidence file
    Steps:
      1. Search backfill output for "429" or "rate limit" or "too many requests"
      2. Verify no matches found
    Expected Result: Zero rate-limit-related errors
    Failure Indicators: Any 429 or rate limit mention in output
    Evidence: .sisyphus/evidence/task-4-rate-limit-check.txt
  ```

  **Commit**: NO (database data only, no code changes)

- [ ] 5. Recompute all politician returns

  **What to do**:
  - Execute `bun scripts/compute-returns.ts` from the project root
  - This recomputes returns for ALL politicians using the now-complete trade dataset + the new `asset_type` filter
  - Expected outcome: significantly more `processed` count (was 164 with incomplete data, should be higher now)
  - Expected outcome: fewer `skipped` (was 181 — many politicians had < 3 trades, now they should have more)
  - After completion, verify Pelosi's return is improved (was -6.32%)
  - Note: This script calls FMP for current stock quotes, so it requires network access

  **Must NOT do**:
  - Do NOT run before Task 4 (backfill) — returns need complete trade data
  - Do NOT modify any code during this task — it's execution only
  - Do NOT modify the `compute-returns.ts` script itself — Task 1 already added the filter

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple script execution with output verification. Runs in ~5-10 minutes.
  - **Skills**: `[]`
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 — Sequential (after Task 4)
  - **Blocks**: F1-F4 (final verification needs accurate data)
  - **Blocked By**: Tasks 1, 4 (needs filter in place + complete trade data)

  **References** (CRITICAL):

  **Pattern References**:
  - `scripts/compute-returns.ts` — The seed/recompute script. Calls `computeAllReturns()` and logs `{ processed, skipped, errors }`. Previous run output: `{ processed: 164, skipped: 181, errors: 0 }`.
  - `src/lib/returns/compute-returns.ts:45-63` — The `normalizeTrade()` function (now with `asset_type` filter from Task 1). This is what ensures options are excluded during this recompute.

  **WHY Each Reference Matters**:
  - The previous run's numbers (164/181/0) are the baseline. After backfill, we expect significantly different numbers because more politicians now have ≥3 trades.

  **Acceptance Criteria**:

  - [ ] Script completes without errors (`errors: 0`)
  - [ ] `processed` count is higher than previous run (was 164)
  - [ ] No runtime errors in output

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Return recomputation completes with improved coverage
    Tool: Bash (bun scripts/compute-returns.ts)
    Preconditions: Task 4 (backfill) completed successfully. .env.local has FMP_API_KEY.
    Steps:
      1. Run `bun scripts/compute-returns.ts` and capture output
      2. Check for `processed`, `skipped`, `errors` counts
      3. Verify `processed` > 164 (previous baseline)
      4. Verify `errors` = 0
    Expected Result: processed > 164, errors = 0, script completes cleanly
    Failure Indicators: errors > 0, processed ≤ 164, script crashes
    Evidence: .sisyphus/evidence/task-5-recompute-output.txt

  Scenario: Pelosi's return is improved after recomputation
    Tool: Bash (curl or Supabase query)
    Preconditions: Recomputation complete
    Steps:
      1. Query the politician_returns table for Pelosi's ID: `a52392ca-cffd-408d-87f0-0e6ec2dff756`
      2. Check her `total_return_pct` value
      3. Verify it is different from -6.32% (and ideally positive)
    Expected Result: Pelosi's return is no longer -6.32%, reflecting more accurate data
    Failure Indicators: Return unchanged at -6.32%
    Evidence: .sisyphus/evidence/task-5-pelosi-return.txt
  ```

  **Commit**: NO (database data only, no code changes)

- [ ] 3. Expand leaderboard disclaimer

  **What to do**:
  - In `src/app/(app)/leaderboard/page.tsx`, replace the existing disclaimer text (lines 232-237) with a more comprehensive version
  - The current disclaimer says: "Returns are estimated based on disclosed trade ranges and historical stock prices. Actual returns may differ."
  - Replace with text that covers three points:
    1. Returns are estimates based on congressional financial disclosure data and historical stock prices
    2. Stock options (calls/puts) are excluded from calculations
    3. Actual returns may differ from estimates
  - Keep the same `<p>` element structure and styling classes (`text-sm text-muted-foreground`)
  - Keep the `title` attribute with the full text for hover tooltip
  - The disclaimer should be concise — 2-3 sentences max, not a legal paragraph

  **Must NOT do**:
  - Do NOT add a separate disclaimer modal or popup
  - Do NOT add links to external resources
  - Do NOT change the layout or styling of the disclaimer area
  - Do NOT modify any other part of the leaderboard page

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Replacing ~3 lines of text in a single JSX element. Trivial change.
  - **Skills**: `[]`
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `copywriting`: Overkill for a 2-sentence disclaimer

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `src/app/(app)/leaderboard/page.tsx:232-237` — The existing disclaimer element. Replace the text content and `title` attribute while preserving the `<p>` element, `className`, and surrounding `<div>` structure.
  - `src/app/(app)/leaderboard/page.tsx:225-238` — The full footer bar containing the disclaimer. Context: it sits alongside a "Showing N qualifying politicians" line and a "Returns computed on [date]" line. The disclaimer is the right-side element in the flex layout.

  **WHY Each Reference Matters**:
  - The disclaimer must fit within the existing responsive flex layout (`sm:flex-row sm:items-center sm:justify-between`). Keeping the same element structure ensures no layout breakage.

  **Acceptance Criteria**:

  - [ ] `bun run build` → succeeds with no errors
  - [ ] Disclaimer text mentions: estimates, stock options excluded, disclosure data

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Disclaimer text is updated with options exclusion mention
    Tool: Bash (grep)
    Preconditions: File has been modified
    Steps:
      1. Run `grep -i "option" src/app/\(app\)/leaderboard/page.tsx`
      2. Verify output contains text about stock options being excluded
      3. Run `grep -i "disclosure" src/app/\(app\)/leaderboard/page.tsx`
      4. Verify output contains reference to disclosure data
    Expected Result: Both grep commands return matching lines from the disclaimer
    Failure Indicators: No matches found, or old disclaimer text still present
    Evidence: .sisyphus/evidence/task-3-disclaimer-grep.txt

  Scenario: Build succeeds with updated disclaimer
    Tool: Bash (bun run build)
    Preconditions: File has been modified
    Steps:
      1. Run `bun run build`
      2. Check exit code is 0
      3. Verify no JSX syntax errors in output
    Expected Result: Build completes successfully
    Failure Indicators: Build fails with JSX parse error or missing closing tag
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES
  - Message: `docs(leaderboard): expand disclaimer to note options exclusion and data source`
  - Files: `src/app/(app)/leaderboard/page.tsx`
  - Pre-commit: `bun run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `bun run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod code (scripts are OK), commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Run `bun run dev` and navigate to `http://localhost:3000/leaderboard`. Verify: (a) disclaimer text is visible and mentions options exclusion + data limitations, (b) politician returns are displayed, (c) page renders without errors. Check terminal for runtime errors.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code changes. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance: no changes to `portfolio-engine.ts`, `trade-sync.ts`, `client.ts`, cron route, or DB schema. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Scope | Files | Pre-commit |
|--------|-------|-------|------------|
| 1 | Filter options from return calculations | `src/lib/returns/compute-returns.ts`, `src/lib/returns/__tests__/compute-returns.test.ts` | `bun run test` |
| 2 | Add backfill rate-limiting delay | `scripts/backfill.ts`, `scripts/backfill.test.ts` | `bun run test` |
| 3 | Expand leaderboard disclaimer | `src/app/(app)/leaderboard/page.tsx` | `bun run build` |

> Tasks 4 and 5 (manual backfill + recompute) modify only database data, not code — no git commit needed for those.

---

## Success Criteria

### Verification Commands
```bash
bun run test          # Expected: all tests pass (182 existing + new)
bun run build         # Expected: clean build, 0 errors
```

### Final Checklist
- [ ] All "Must Have" present (delay, filter, disclaimer, tests pass)
- [ ] All "Must NOT Have" absent (no schema changes, no portfolio-engine edits, etc.)
- [ ] All tests pass (`bun run test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Backfill completed successfully
- [ ] Returns recomputed with improved accuracy
- [ ] Leaderboard shows expanded disclaimer
