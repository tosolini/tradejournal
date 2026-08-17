# Managing Trades

Trades are the core of TradeJournal. Every buy or sell operation is recorded as a trade with all the details needed for performance analysis. Fees and capital-gain tax are configured per broker and applied automatically to every calculation.

## Creating a New Trade

Click **+ New Trade** in the sidebar. The modal offers two modes:

- **Wizard** (default) — a guided 6-step flow
- **Quick Trade** — a single compact form with the essential fields

### The 6-Step Wizard

| Step | What you set |
|---|---|
| 1. **Account & Ticker** | The trading account and the symbol (with autocomplete) |
| 2. **Entry & Size** | Quantity — in **shares** or by **notional value** (€) — plus the estimated fee |
| 3. **Direction** | **Long** or **Short** |
| 4. **Take Profit** | Target — as a **price** or **%** from entry, with a slider |
| 5. **Stop Loss** | Limit — as a **price** or **%** from entry, with a slider |
| 6. **Execution** | Execution type (`Open`, `Partial`, `Close`) and a full summary before saving |

Each step validates before proceeding; an indicator shows progress. The wizard resets when reopened.

### Symbol Autocomplete

If you have imported tickers (see [Tickers](tickers.md)), the symbol field shows real-time suggestions with symbol, name, ISIN and market. If the ticker is not in the database, you can always type it manually.

## Trade List

The **Trades** section shows all operations in a sortable, filterable table.

- **Recent executions** panel on top (last 12, searchable), linking to the related trade
- **Trades table:** sort on any column; **status filter** (All / Open / Partial / Close) and full-text search
- **12 optional columns** (Avg Entry, Avg Exit, Entry Total, Exit Total, Open Qty, Hold, Return, Return %, TP %, SL %, TP Abs, SL Abs) — toggle visibility per column; the choice is saved
- **Row actions:** View, Edit, Manage images, Quick Close, Delete

### Quick Close

From the list row, open the inline **Quick Close** panel: set the exit price (pre-filled with your TP or average entry), pick a reason (`Manual`, `Take profit`, `Stop loss`), optionally add a note, and close. P&L and the capital-gain tax estimate are computed automatically.

## Trade Detail

Clicking a trade opens the detail page with tabs:

- **Overview** — symbol, side, status, TP/SL (price, %, absolute and net of fees/tax), return
- **Chart** — TradingView chart for the symbol
- **Technical** — TradingView technical analysis widget
- **Close** — close form (datetime, price, reason, note) for open trades
- **Executions** — full execution history with auto-computed broker fees
- **Images** — upload screenshots/annotations and view them with zoom

### Open Trades: Current Market

For open trades, the **current market price** (via Yahoo Finance) is shown with market value, unrealized P&L and current return %.

### Closed Trades: Close Summary

For closed trades, a summary shows: close date and reason, exit price/fee, **gross P&L**, total fees, **net P&L after fees**, the broker's capital-gain mode and rate, the **tax estimate**, and net after tax.

## Executions and Fees

- Every execution records action, quantity, price, date, venue and an optional note
- The **fee is computed automatically from the broker configuration** (fixed amount or percentage) and stored with the execution
- Add, edit or delete executions from the detail page; metrics (weighted-average P&L, hold duration, returns) are recomputed
