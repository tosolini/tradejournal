const API_BASE = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL || "http://localhost:18000";

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

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function login(username_or_email: string, password: string) {
  return api<{ access_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username_or_email, password }),
  });
}

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
