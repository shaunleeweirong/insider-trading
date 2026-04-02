# Financial Modeling Prep (FMP) Research

## Verdict

FMP is sufficient as the **primary data provider for v1** of this app.

That is true for the app **as currently implemented**, because the code only needs four FMP data surfaces and FMP appears to offer all four:

1. congressional trades
2. stock quotes
3. historical prices
4. stock/company lookup data

The bigger risk is **not obvious API coverage gaps**. The bigger risk is:

- single-vendor dependence
- strict schema assumptions in the current code
- ticker-centric assumptions when congressional disclosures do not cleanly map to a stock symbol

## What the app currently uses FMP for

The app currently calls these endpoints in `src/lib/fmp/client.ts`:

### 1. Congressional disclosures

- `GET /stable/senate-trading?page={page}`
- `GET /stable/senate-trades-by-name/{name}`
- `GET /stable/house-disclosure?page={page}`

These feed the sync pipeline in `src/lib/sync/trade-sync.ts`.

Required fields from the current Zod schemas:

- `firstName`
- `lastName`
- `office`
- `transactionDate`
- `assetDescription`
- `type`
- `amount`

Optional / nullable fields currently accepted:

- `ticker`
- `assetType`
- `comment`
- `link`

### 2. Stock quote enrichment

- `GET /api/v3/quote/{ticker}`

This feeds stock display and quote caching.

The current code requires:

- `symbol`
- `name`
- `price`
- `change`
- `changesPercentage`

### 3. Historical price enrichment

- `GET /api/v3/historical-price-full/{ticker}?from=...&to=...`

This feeds charting and cached `stock_prices` rows.

The current code requires each history row to contain:

- `date`
- `close`
- `high`
- `low`
- `open`
- `volume`

## What FMP appears to cover well

Based on the external research, FMP appears to provide:

- congressional trading endpoints for Senate and House disclosures
- quote endpoints for stocks and related market data
- historical price endpoints
- profile/search/directory endpoints for company and symbol discovery

That means FMP covers the core data surfaces this app currently depends on.

## Important fit assessment

### Where FMP fits the app well

FMP is a good fit for the current implementation because:

- the app is already built around FMP endpoints
- no extra provider integration is required to launch v1
- congressional trade ingestion and market enrichment both map to FMP products
- the app already uses local caching in Supabase for quotes and history, which reduces pressure on live lookups

### Where the current implementation is fragile

The main hidden risk is the **strictness of the app**, not necessarily FMP itself.

#### 1. Quote schema is stricter than the UI really needs

`stockQuoteSchema` currently requires `changesPercentage`.

If FMP returns:

- `symbol`
- `name`
- `price`
- `change`

but omits `changesPercentage`, then the current code rejects the whole quote and returns `null`.

That means the stock page can lose company name and quote data even when most of the payload is usable.

#### 2. Trade records are ticker-sensitive

The app allows `ticker` to be nullable for trade rows, which is good.

But downstream UX gets weaker when disclosures do not resolve cleanly to a ticker, because:

- stock detail pages depend on a valid ticker
- historical charting depends on a valid ticker
- "most traded" style calculations are more useful when tickers are present

So FMP can still be "sufficient" overall while some disclosure rows remain partially useful.

#### 3. No fallback provider exists

The app currently has no alternate vendor path.

If FMP:

- changes response shape
- temporarily returns incomplete quote fields
- rate limits too aggressively
- has gaps for some tickers or historical ranges

the app degrades directly.

Current fallback behavior is limited to:

- retry with backoff
- cached Supabase quote/history rows
- skipping invalid rows

## Operational and product risks

### 1. Congressional data should not be treated as audit-grade truth

For launch, FMP is acceptable as the source feeding the product.

But it should be treated as:

- vendor-normalized data
- possibly delayed
- possibly partial
- not a guaranteed source-of-record

This matters especially if you plan to market the product as highly authoritative.

### 2. Licensing / public display should be confirmed

The research suggests this should be reviewed before broad public launch.

That is not a code blocker, but it is a business risk.

### 3. Historical depth and edge-case coverage should be validated with real symbols

The docs indicate historical data support, but for this app the real question is not "does FMP have historical data at all?"

The real question is:

- does it consistently cover the tickers that appear in congressional disclosures?
- does it cover enough history for the politician pages and charting windows you want?

That should be validated with representative production-like symbols.

## Practical launch recommendation

### Recommended decision

Deploy with FMP as the primary provider for v1.

### Why

- FMP covers the app's current endpoint needs
- the implementation is already aligned to FMP
- replacing or supplementing the provider before launch would add scope without a proven need

### But launch with these expectations

Treat FMP as:

- primary provider
- best-effort enrichment layer
- not your final permanent source-of-truth architecture

## What should be monitored after launch

These are the main signals that would justify revisiting the provider choice or hardening the integration.

### Escalation triggers

Reassess FMP or add a fallback if you observe:

1. repeated quote parse failures
2. many congressional trades with unresolved or missing tickers
3. empty or unreliable historical data for symbols users care about
4. too many 429s or degraded sync reliability
5. user trust issues caused by incomplete or delayed disclosures

## Current code-level conclusions

### Confirmed strengths

- retries exist for `429` and `5xx`
- invalid trade/history rows are skipped instead of crashing the whole batch
- stock quote and history data are cached into Supabase

### Confirmed weaknesses

- quote parsing is brittle
- there is no second provider fallback
- some useful-but-incomplete FMP payloads may currently be discarded

## Bottom line

FMP is good enough to launch this app with.

The real launch risk is not "does FMP have the needed APIs?" — it does.

The real launch risk is whether the current integration is tolerant enough when FMP data is incomplete, delayed, or slightly different from the strict schema assumptions in this codebase.
