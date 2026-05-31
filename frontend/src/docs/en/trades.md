# Managing Trades

Trades are the core of TradeJournal. Every buy or sell operation is recorded as a trade with all the details needed for performance analysis.

## Creating a New Trade

Click **+ New Trade** in the sidebar. A modal opens with the fields to fill in.

### Main Fields

| Field | Description |
|---|---|
| **Account** | The trading account for this operation |
| **Symbol** | The ticker (e.g. `AAPL`, `ENEL.MI`). Supports autocomplete if tickers have been imported. |
| **Direction** | `Long` (buy) or `Short` (short sell) |
| **Quantity** | Number of units/lots traded |
| **Entry Price** | Price at which the position was opened |
| **Execution Type** | `Market`, `Limit`, `Stop`, `Stop Limit` |
| **Date & Time** | Opening date and time (local format) |
| **Take Profit** | Target price level for closing at a profit |
| **Stop Loss** | Price level to limit losses |
| **Notes** | Free-form notes about the operation |

### Symbol Autocomplete

If you have imported tickers (see [Tickers](tickers.md) section), the Symbol field shows real-time suggestions:

1. Type at least 1–2 characters
2. A dropdown appears with matching tickers (Symbol + Name + Market)
3. Click a result to select it

If the ticker is not in the database, you can always type it manually.

## Trade List

The **Trades** section shows all operations in a sortable, filterable table.

- **Available filters:** by date, account, symbol, direction, status
- **Sorting:** by date, P&L, return percentage

## Trade Detail

Clicking a trade opens the detail page with:

- All operation data
- Automatic **P&L** (profit/loss) and percentage calculation
- Section to attach **images** (chart screenshots, analyses)
- Detailed notes

## Closing a Trade

From the detail page or the list, click **Edit** to update the trade with:

- Exit price
- Closing date
- Closing reason (Take Profit, Stop Loss, Manual, Expiry)

## Importing Trades from CSV

Trades can be bulk-imported via CSV file. The supported format is compatible with major broker exports. Go to **Trades → Import** to access this feature.
