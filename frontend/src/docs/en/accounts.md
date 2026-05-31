# Accounts and Brokers

## Brokers

Brokers represent the financial intermediaries through which you operate on markets. You must configure at least one broker before creating an account.

### Adding a Broker

Go to **Broker** in the sidebar and click **+ New Broker**.

**Available fields:**

| Field | Description |
|---|---|
| **Name** | Broker name (e.g. "Directa SIM") |
| **Website** | Broker website URL |
| **Commission** | Mode: `Fixed` (fixed amount per trade) or `Percentage` (% of value) |
| **Commission value** | Amount or percentage |
| **Commission currency** | Currency for commissions |
| **Capital gain tax** | Mode: `Immediate` (at close) or `Year end` |
| **Tax rate** | Capital gains tax rate (default 26%) |

### Markets / Exchanges

Each broker can have one or more **markets** (exchanges) enabled. Markets define:

- Which exchanges you can trade through that broker
- Opening and closing hours
- Reference timezone
- Whether the market is closed on weekends

#### Adding a Market

In the broker card, click **+ Add Market** (Markets tab).

> 💡 For Directa SIM, an automatic **seed** is available that imports all markets from the official [directa.it/mercati](https://www.directa.it/mercati) page. Click **Import Directa Markets** to populate the list automatically.

**Exchange fields:**

| Field | Description |
|---|---|
| **Name** | Market name (e.g. "Borsa Italiana") |
| **MIC** | ISO 10383 Market Identifier Code (e.g. `XMIL`) |
| **Suffix** | Yahoo Finance/ticker suffix (e.g. `.MI` for Milan) |
| **Country** | Exchange country |
| **Currency** | Trading currency |
| **Timezone** | Exchange timezone (e.g. `Europe/Rome`) |
| **Open / Close** | Local trading hours |
| **Closed on weekends** | If `Yes`, the market is considered closed on Saturday and Sunday |

---

## Accounts

Accounts represent individual trading portfolios, linked to a broker.

### Adding an Account

Go to **Accounts** and click **+ New Account**.

**Available fields:**

| Field | Description |
|---|---|
| **Name** | Identifying name (e.g. "Main account", "Paper trading") |
| **Broker** | Reference broker for this account |
| **Currency** | Account denomination currency |
| **Starting balance** | Initial account capital |
| **Description** | Optional notes |

### Broker-Account Link

An account is always associated with a single broker. This association:
- Automatically applies the commissions configured in the broker
- Uses the broker's tax rate for net P&L calculations
- Limits symbol autocomplete to the broker's enabled markets
