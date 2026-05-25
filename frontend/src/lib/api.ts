import i18n from "./i18n";

const API_BASE = "http://localhost:18000";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ErrorPayload = {
  detail?: string | { code?: string; message?: string };
};

async function parseApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as ErrorPayload;
    if (typeof parsed.detail === "string") {
      return new ApiError(parsed.detail, status);
    }
    if (parsed.detail && typeof parsed.detail === "object") {
      const message = parsed.detail.message || "API error";
      return new ApiError(message, status, parsed.detail.code);
    }
  } catch {
    // Keep plain-text fallback when response body is not JSON.
  }

  return new ApiError(text || "API error", status);
}

export type Trade = {
  id: number;
  account_id: number;
  symbol: string;
  market: string;
  side: string;
  status: string;
  account_currency?: string;
  strategy_name?: string;
  target_price?: string;
  stop_loss?: string;
  created_at: string;
  average_entry_price?: string;
  average_exit_price?: string;
  entry_total?: string;
  exit_total?: string;
  open_position_qty?: string;
  hold_duration_hours?: string;
  net_return?: string;
  return_pct?: string;
};

export type Execution = {
  id: number;
  trade_id: number;
  action: string;
  executed_at: string;
  quantity: string;
  price: string;
  fee: string;
  currency: string;
};

export type TradeImage = {
  id: number;
  trade_id: number;
  original_path: string;
  annotated_path?: string | null;
  mime_type?: string | null;
};

export type TradeDetail = {
  trade: Trade;
  executions: Execution[];
  images: TradeImage[];
  pnl: Record<string, unknown> | null;
  closure?: {
    closed_at: string;
    close_reason?: string | null;
    exit_action: string;
    exit_price: string;
    exit_fee: string;
    exit_currency: string;
    gross_pnl: string;
    net_pnl: string;
    capital_gain_mode: string;
    capital_gain_rate: string;
    capital_gain_tax_estimate?: string | null;
    tax_note?: string | null;
    total_fees: string;
  } | null;
};

export type RecentExecution = {
  id: number;
  trade_id: number;
  trade_symbol: string;
  action: string;
  executed_at: string;
  quantity: string;
  price: string;
  fee: string;
  currency: string;
};

export type Account = {
  id: number;
  name: string;
  broker_id: number | null;
  broker_name: string | null;
  base_currency: string;
  cash_balance: string;
};

export type Broker = {
  id: number;
  name: string;
  fee_mode: "fixed" | "percent";
  fee_value: string;
  fee_currency: string;
  capital_gain_mode: "immediate" | "year_end";
  capital_gain_rate: string;
};

function xhrRequest<T>(method: string, path: string, body?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem("token");
    const locale = i18n.resolvedLanguage || i18n.language || "en";
    const url = API_BASE + path;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept-Language", locale);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onload = () => {
      if (xhr.status === 401) {
        localStorage.removeItem("token");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
        reject(new Error("Unauthorized"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText as unknown as T);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("XHR failed: " + url));
    if (body) xhr.send(body);
    else xhr.send();
  });
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method || "GET";
  const body = options?.body as string | undefined;
  return xhrRequest<T>(method, path, body);
}

export async function login(username_or_email: string, password: string) {
  return api<{ access_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username_or_email, password }),
  });
}

export type Asset = {
  id: number;
  symbol: string;
  name: string;
  isin?: string | null;
  instrument_type: string;
  exchange?: string | null;
  currency: string;
};

export type Holding = {
  id: number;
  account_id: number;
  asset_id: number;
  quantity: string;
  avg_cost: string;
  entry_date: string;
  exit_date: string | null;
};

export type HoldingDetail = {
  id: number;
  account_id: number;
  asset_id: number;
  asset_symbol: string;
  asset_name: string;
  instrument_type: string;
  asset_currency: string;
  quantity: string;
  avg_cost: string;
  entry_date: string;
  exit_date: string | null;
  hold_duration_days: number | null;
  current_price: string;
  market_value: string;
  return_value: string;
  return_pct: string;
};

export type PortfolioSummary = {
  account_id: number;
  account_name: string;
  total_value: string;
  total_cost: string;
  total_return: string;
  total_return_pct: string;
  holdings_count: number;
};

export type PortfolioHistoryPoint = {
  date: string;
  value: number;
  cost: number;
  return_pct: number;
};

export async function fetchTradeImageBlobUrl(imageId: number, variant: "original" | "annotated" = "original") {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/api/uploads/trade-images/${imageId}/content?variant=${variant}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ── Assets ──────────────────────────────────────────
export function fetchAssets(): Promise<Asset[]> {
  return api("/api/assets/");
}

export function createAsset(payload: Partial<Asset>): Promise<Asset> {
  return api("/api/assets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAsset(id: number, payload: Partial<Asset>): Promise<Asset> {
  return api(`/api/assets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAsset(id: number): Promise<void> {
  return api(`/api/assets/${id}`, { method: "DELETE" });
}

// ── Accounts ────────────────────────────────────────
export function fetchAccounts(): Promise<Account[]> {
  return api("/api/accounts");
}

// ── Holdings ────────────────────────────────────────
export function fetchHoldings(accountId?: number): Promise<Holding[]> {
  const params = accountId ? `?account_id=${accountId}` : "";
  return api(`/api/holdings/${params}`);
}

export function createHolding(payload: {
  account_id: number;
  asset_id: number;
  quantity: string;
  avg_cost: string;
  entry_date: string;
  exit_date?: string | null;
}): Promise<Holding> {
  return api("/api/holdings/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHolding(id: number, payload: Partial<Holding>): Promise<Holding> {
  return api(`/api/holdings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHolding(id: number): Promise<void> {
  return api(`/api/holdings/${id}`, { method: "DELETE" });
}

// ── Portfolio ───────────────────────────────────────
export function fetchPortfolioDetails(accountId?: number): Promise<HoldingDetail[]> {
  const params = accountId ? `?account_id=${accountId}` : "";
  return api(`/api/portfolio/details${params}`);
}

export function fetchPortfolioSummary(accountId?: number): Promise<PortfolioSummary[]> {
  const params = accountId ? `?account_id=${accountId}` : "";
  return api(`/api/portfolio/summary${params}`);
}

export function fetchPortfolioHistory(accountId?: number): Promise<PortfolioHistoryPoint[]> {
  const params = accountId ? `?account_id=${accountId}` : "";
  return api(`/api/portfolio/history${params}`);
}
