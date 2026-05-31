# Calendar and Markets

## Calendar Section

The **Calendar** section contains two tabs:

- **Calendar** — monthly view of recorded trading operations
- **Markets** — Gantt chart showing financial market opening hours

---

## Markets Tab (Gantt)

The market Gantt shows in a **24-hour window** (starting from the current time) which markets are open, about to open, or closed.

### How to Read the Gantt

Each row represents a market/exchange configured in your brokers. The colored bar indicates the **trading window**:

| Color | Meaning |
|---|---|
| Green (teal) | Market **open** right now |
| Gray/slate | Market **closed** right now |
| Pink/red | Market **closed today** (weekend or holiday) |

The vertical line indicates the **current time** in your timezone.

### Timezone

Times are automatically converted based on the **timezone configured in your profile** (Settings → Profile → Timezone).

> ⚠️ If no timezone is set in your profile, the Gantt will use the browser's local time, which may differ from your actual timezone.

### Weekend and Holiday Closures

Markets with the **"Closed on weekends"** option enabled are shown as closed on Saturday and Sunday.

The following dates are considered **global holidays** by default:
- January 1st (New Year's Day)
- August 15th (Ferragosto — Italian public holiday)
- December 25th (Christmas Day)

**Forex and derivatives markets** (LMAX, CME) typically have no weekend closure and remain operational.

### Auto-Update

The Gantt updates in real time. If you leave the page open, the bars shift as time progresses.

---

## Managing Markets

The markets shown in the Gantt come from the **exchanges configured in brokers**. To add a market:

1. Go to **Broker** in the sidebar
2. Select the broker
3. Click the **Markets** tab
4. Click **+ Add Market** or use **Import Directa Markets** for automatic seeding

See the [Accounts and Brokers](accounts.md) section for details on exchange configuration.
