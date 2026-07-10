# PockeTrend Frontend

Web UI for logging expenses, earnings, loan balances, and analytics.

## Backends

The app supports two backends:

1. **Kotlin API (recommended)** — JWT sign-in, loan auto-deduction, shops, live balances. Default API URL: `http://localhost:8081`
2. **Google Sheets (legacy)** — via Google Apps Script Web App URL in `js/api.js` (`MoneyTracker.GAS_URL`)

On first visit, sign in with your API email/password or choose **Continue with Google Sheets**.

## Kotlin API setup

1. Run `money-manager-api` locally (`docker compose up` or `./gradlew run`).
2. Ensure `JWT_SECRET` is set in the API `.env`.
3. Open `index.html` (or serve the folder with any static host).
4. Sign in from the overlay — API URL defaults to `http://localhost:8081`.
5. On **Loans**, click **Import sheet defaults** to load your existing loan balances.

## Google Apps Script (legacy)

1. Deploy the Google Apps Script as a Web App.
2. Update `MoneyTracker.GAS_URL` in `js/api.js` if needed.
3. Use **Continue with Google Sheets** on the sign-in overlay.

### clasp

```sh
npm install
npm run clasp:login
# copy .clasp.json.example → .clasp.json, set scriptId
npm run clasp:push
```

## Pages

- `index.html` — add expense/earning, month overview, first-time setup banner
- `loans.html` — loan balances (API)
- `analytics.html` — charts (API or legacy GAS)
- `transactions.html` — recent transactions

## First-time API setup

1. Sign in (create account if needed).
2. On Home, click **Seed default categories** (pots match your legacy sheet).
3. Click **Initialize month** for the selected month (seeds recurring lines).
4. On **Loans**, click **Import sheet defaults** for loan balances.
5. Log expenses — Loan paid / Takeaway / Grocery use API pickers.

## Run locally

Serve the folder (or open `index.html`). For API mode, the API must allow CORS (enabled in `money-manager-api`).

## Deploy

- **GitHub Pages**, **Netlify**, or **Vercel** — static deploy; point API URL at your hosted Kotlin API in sign-in.
