# Dashboard, Performance and Portfolio

This section covers the three analysis views: **Dashboard**, **Performance** and **Portfolio**.

---

## Dashboard

The home page gives an operational summary of your whole journal, combining trade results and portfolio positions.

**Key figures:**

- **Total PnL** (realized + mark-to-market), **Realized PnL**, **Unrealized PnL** (MTM), **Win Rate** (wins · losses caption)
- Secondary cards: **Trades** count, **Open positions**, **Capital-gain tax estimate**, **Capital-gain loss offset**

**Charts and panels:**

| Panel | Content |
|---|---|
| Equity curve | Portfolio value over time (area) with an optional dashed cost line; range selector **1M / 3M / 6M / 1Y / ALL** |
| Outcome donut | Wins / losses / breakeven distribution with win rate in the center; profit factor, average win and average loss |
| Monthly PnL | Realized P&L of the last 12 months as bars, with trade counts |
| All-assets daily PnL | Daily P&L of the last 30 days covering trades **and** holdings, with a cumulative header |
| Asset allocation | Per-symbol market value with weight % progress bars and by-instrument-class chips |
| Top trades | Best trades: symbol, side, status, close date, return % and net P&L |

The `Updated` timestamp reflects the last portfolio snapshot date. Currency follows your locale.

---

## Performance

Deeper look at portfolio value evolution over time, powered by the daily portfolio snapshots.

- **KPIs:** Portfolio Value, Cumulative PnL, Best Day, Worst Day
- **Equity curve** — portfolio value from daily snapshots (area chart)
- **Daily PnL bars** — last 30 days, with the % of winning days
- **Monthly calendar grid** — color-coded days (green = positive, red = negative); click any day to open the **Day Detail** panel with total value, day P&L (+ %) and cumulative P&L

> ℹ️ Performance data comes from the **daily snapshot job** (see Settings → Snapshot time). If no snapshots exist yet, use **recompute** (`POST /api/snapshots/recompute` and `/api/snapshots/portfolio/recompute`) to backfill.

---

## Portfolio

Track **ETF and bond** positions separately from trades, with mark-to-market valuation.

- **KPIs:** Total Value, Total Cost, Total Return, Return %
- **Portfolio history** — value evolution chart
- **Holdings table:** symbol, name, instrument type, quantity, average cost, entry/exit dates, hold duration, **current price** (Yahoo Finance), market value, return ($) and return %; per-row **edit** and **delete**
- **Add / Edit Holding:** account, asset, quantity, average cost, entry/exit dates

Holdings are included in the portfolio snapshots, the equity curve and the all-assets daily P&L on the Dashboard.
