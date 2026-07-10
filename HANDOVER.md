# PockeTrend API Handover

**After every push:** update this file + `README.md` → `git push` → log to Airtable from `money-manager-api` (`npm run log:handoff`).

## Backend status (July 2026)

The Kotlin API in **`money-manager-api`** is the primary backend. The frontend supports **JWT sign-in** to the Kotlin API (loans, shops, live balances) with an optional **Google Sheets** fallback.

| Area | Status |
|------|--------|
| Core transactions + analytics endpoints | Done in API |
| JWT multi-user auth | Done in API |
| Recurring templates + month initialize | Done in API |
| Per-month line overrides | Done in API |
| User-defined spending/earning categories | Done in API |
| Loan ledger + payee on Loan paid | Done in API + FE (Loans page, API sign-in) |
| Shop picker on Takeaway/Grocery | Done in API + FE |
| FE wired to Kotlin API (JWT) | Done — sign in overlay; GAS fallback |
| API-first category catalog + month init UI | Done — `catalog.js`, seed defaults, initialize month |
| Replace Google Sheets backend in this repo | **Optional legacy** — "Continue with Google Sheets" |

API handoff: [`money-manager-api/HANDOVER.md`](../money-manager-api/HANDOVER.md) · Swagger: `http://localhost:8081/docs`

## Target repository

```txt
https://github.com/Projucti-team/money-manager-api.git
```

## Context

The current PockeTrend web frontend uses Google Apps Script and Google Sheets as its backend. The goal is to move to a lower-cost practical backend hosted on a Hetzner server.

Target architecture:

- PostgreSQL database hosted on the Hetzner server
- Node.js API hosted on the same Hetzner server
- Future mobile app and current frontend will consume this API
- Firebase/Auth can be considered later, but keep auth simple for the first backend pass

## Current backend behavior to replace

The existing Google Apps Script backend supports:

- Add expense
- Add earning
- Latest transactions
- Monthly overview balances
- Expense category/pot summaries
- Analytics chart data
- Daily spending by date range
- Monthly spending trends

## Suggested API stack

- Node.js
- TypeScript
- Fastify or Express
- PostgreSQL
- Prisma or Drizzle migrations
- Docker Compose for local/dev deployment
- `.env.example`
- README with setup/deploy instructions
- Health endpoint

## Suggested data model

### `transactions`

- `id`
- `type`: `expense` / `earning`
- `date`
- `month`
- `category_or_source`
- `normalized_category_or_source`
- `amount`
- `notes`
- `created_at`

### `categories`

- `id`
- `name` normalized lowercase
- `display_name`
- `type` or grouping optional
- `created_at`

### `monthly_pots`

- `id`
- `month`
- `category_id`
- `pot_max`
- `created_at`
- `updated_at`

### Optional later

- `monthly_summaries`, or calculate summaries via queries.

## Important behavior

Categories must be case-insensitive:

- `Loan Paid`
- `Loan paid`
- `loan paid`

should all be treated as the same category.

## Endpoints to implement first

```txt
GET /health
POST /transactions
GET /transactions/latest?limit=10
GET /analytics/chart-data
GET /analytics/daily-spending?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /categories/expense-summary?month=June%202026
GET /months/:month/overview
```

## Endpoint behavior details

### `POST /transactions`

- Add expense or earning.
- Store normalized category/source.
- Store display label.
- Return created transaction.

### `GET /transactions/latest`

- Return latest N transactions, newest first.

### `GET /analytics/chart-data`

- Return monthly category totals for expenses.
- Categories must be normalized lowercase.

### `GET /analytics/daily-spending`

- Return daily expense totals between `from` and `to` dates.
- Include days with zero spend.
- Return total for range.

### `GET /categories/expense-summary`

For the selected month, return categories sorted by frequency from latest 500 expense transactions.

Include:

- category name
- pot max
- spent
- left
- recent count

### `GET /months/:month/overview`

Return:

- left
- scheduled left
- forecast left

This can be calculated later or stubbed initially if needed.

## Deliverables for the new agent

- Clone `https://github.com/Projucti-team/money-manager-api.git`
- Create a feature branch
- Scaffold the API
- Add migrations/schema
- Add Docker Compose for API + Postgres
- Add README
- Add basic validation/error handling
- Run checks/tests if present
- Commit and push
- Open a draft PR

## Notes

- This is replacing Google Apps Script eventually, but do not modify the frontend repo until API integration is explicitly requested.
- Keep the first API version practical and small.
- Prioritize clean DB schema and endpoints matching the current app behavior.
- JWT email/password auth is implemented in the API for multi-user App Store / Play Store rollout.
- Default category presets are a frontend UX concern when switching from Sheets to the API.

## Work log (Airtable)

- **Project:** PockeTrend App
- **Base:** `appe8oeguzTq8XzY5` · **Logs table:** `tblUH5FCiJD7KNIVm`
- Run from API repo: `cd ../money-manager-api && npm run log:handoff`
- Same calendar day updates one row (appends to **Changelog Update**); see API `HANDOVER.md` for token/env details.
