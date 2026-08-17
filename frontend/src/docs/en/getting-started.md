# Getting Started

Welcome to **TradeJournal**, your self-hosted trading diary to track operations, portfolio, and performance across financial markets.

## First Login

On first access you are prompted for your credentials. If the instance was just started, use the default credentials provided by the administrator (see below).

A welcome banner on **Settings** walks through the initial 4 steps:

1. **Change your credentials** — the instance initially uses the default admin account. Set your own email and a strong password.
2. **Link a broker** — create a broker and its markets before opening accounts.
3. **Create an account** — accounts represent the portfolios where you record trades and cash movements.
4. **Start journaling** — record your first trade with the **+ New Trade** wizard.

> ⚠️ **Default admin account.** At first startup the backend auto-creates an admin user (`admin` / `password123`, configurable via `SEED_ADMIN_*`). Always change these credentials outside local development. When `ENVIRONMENT=production` is set, the backend **refuses to start** with the default admin password or the default `JWT_SECRET_KEY`.

## Recommended Initial Setup

Follow these steps before recording your first trade.

### 1. Set Your Profile and Timezone

Go to **Settings → Account** and configure:

- **Timezone** — essential for correct market hours in the calendar. Choose your zone (e.g. `Europe/Rome` for Italy).
- **Email and password** — update the initial credentials.

> ⚠️ Without a timezone configured, the market calendar will not display hours correctly.

### 2. Create a Broker

Go to **Broker** and create at least one broker you operate with (e.g. Directa SIM, DEGIRO, Interactive Brokers).

For each broker you can:

- Set name and website
- Configure commissions (fixed or percentage) and the commission currency
- Set the **capital-gain tax mode** (`Immediate` at close or `Year end`) and tax rate (default 26%)
- Add the **markets/exchanges** enabled for that broker — for Directa SIM an automatic seed is available

### 3. Create an Account

Go to **Accounts** and create a trading account linked to the broker you just created. The account represents the real or simulated portfolio where you record operations.

Each account has a **cash ledger** for deposits and withdrawals (see [Accounts and Brokers](accounts.md)).

### 4. Import Tickers

Go to **Tickers** and import the CSV file of tradable securities (available from Euronext). This enables **symbol autocomplete** when creating a new trade (see [Tickers](tickers.md)).

### 5. Create Your First Trade

Click **+ New Trade** in the sidebar and follow the 6-step wizard (see [Managing Trades](trades.md)).

---

## Application Structure

| Section | Description |
|---|---|
| Dashboard | KPI overview: P&L, equity curve, allocation, top trades |
| Calendar | Monthly journal calendar and market hours (Gantt) |
| Trades | All recorded operations, executions and close flows |
| Notes | Daily journal with rich-text editor, mood and market tags |
| Help | This manual |
| Portfolio | ETF & bond holdings with mark-to-market values |
| Performance | Portfolio value, equity curve, daily P&L by day |
| Assets | Instruments registry (ETF, stock, bond, fund) |
| Accounts | Trading accounts and cash ledger |
| Broker | Brokers, fee/tax configuration and enabled markets |
| Tickers | Symbol database for autocomplete |
| Settings | Profile, admin users, language, data export/import, snapshot time |
