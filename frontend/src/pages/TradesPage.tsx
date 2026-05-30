import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError, RecentExecution, Trade, api } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";

function asNumber(value: string | number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetric(value: string | number | undefined): string {
  if (value === undefined) {
    return "-";
  }
  const n = asNumber(value);
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoney(value: string | number | undefined, currency?: string): string {
  if (value === undefined) {
    return "-";
  }
  const n = asNumber(value);
  const normalized = (currency || "").trim().toUpperCase();
  if (!normalized) {
    return formatMetric(n);
  }

  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: normalized,
    }).format(n);
  } catch {
    return `${formatMetric(n)} ${normalized}`;
  }
}

function formatHoldHours(value: string | number | undefined): string {
  if (value === undefined) {
    return "-";
  }
  const totalHours = Math.max(0, Math.floor(asNumber(value)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

function computeTpPct(side: string, entry: number, takeProfit: number): number | null {
  if (entry <= 0 || takeProfit <= 0) {
    return null;
  }
  if (side === "short") {
    return ((entry - takeProfit) / entry) * 100;
  }
  return ((takeProfit - entry) / entry) * 100;
}

function computeSlPct(side: string, entry: number, stopLoss: number): number | null {
  if (entry <= 0 || stopLoss <= 0) {
    return null;
  }
  if (side === "short") {
    return ((stopLoss - entry) / entry) * 100;
  }
  return ((entry - stopLoss) / entry) * 100;
}

function computeTpAbs(side: string, entry: number, takeProfit: number, qty: number): number | null {
  if (entry <= 0 || takeProfit <= 0 || qty <= 0) {
    return null;
  }
  if (side === "short") {
    return (entry - takeProfit) * qty;
  }
  return (takeProfit - entry) * qty;
}

function computeSlAbs(side: string, entry: number, stopLoss: number, qty: number): number | null {
  if (entry <= 0 || stopLoss <= 0 || qty <= 0) {
    return null;
  }
  if (side === "short") {
    return (stopLoss - entry) * qty;
  }
  return (entry - stopLoss) * qty;
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

type OptionalTradeColumnKey =
  | "avgEntry"
  | "avgExit"
  | "entryTotal"
  | "exitTotal"
  | "openQty"
  | "hold"
  | "return"
  | "returnPct"
  | "tpPct"
  | "slPct"
  | "tpAbs"
  | "slAbs";

type SortableTradeColumnKey = "date" | "symbol" | "status" | "side" | OptionalTradeColumnKey;
type SortableRecentExecutionColumnKey = "date" | "qty" | "price" | "fee";
type UserPreferencesPayload = {
  preferences?: {
    trades?: {
      visibleOptionalColumns?: Partial<Record<OptionalTradeColumnKey, boolean>>;
    };
  };
};

const OPTIONAL_TRADE_COLUMNS: Array<{ key: OptionalTradeColumnKey; label: string }> = [
  { key: "avgEntry", label: "Avg Entry" },
  { key: "avgExit", label: "Avg Exit" },
  { key: "entryTotal", label: "Entry Total" },
  { key: "exitTotal", label: "Exit Total" },
  { key: "openQty", label: "Open Qty" },
  { key: "hold", label: "Hold" },
  { key: "return", label: "Return" },
  { key: "returnPct", label: "Return %" },
  { key: "tpPct", label: "TP %" },
  { key: "slPct", label: "SL %" },
  { key: "tpAbs", label: "TP Assoluto" },
  { key: "slAbs", label: "SL Assoluto" },
];

const DEFAULT_VISIBLE_OPTIONAL_COLUMNS: Record<OptionalTradeColumnKey, boolean> = {
  avgEntry: true,
  avgExit: true,
  entryTotal: true,
  exitTotal: true,
  openQty: true,
  hold: true,
  return: true,
  returnPct: true,
  tpPct: true,
  slPct: true,
  tpAbs: true,
  slAbs: true,
};

const VISIBLE_COLUMNS_STORAGE_KEY = "trades.visibleOptionalColumns";

function hasStoredVisibleOptionalColumns(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return Boolean(window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY));
  } catch {
    return false;
  }
}

function loadVisibleOptionalColumns(): Record<OptionalTradeColumnKey, boolean> {
  if (typeof window === "undefined") {
    return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
  }
  try {
    const raw = window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
    }
    const parsed = JSON.parse(raw) as Partial<Record<OptionalTradeColumnKey, boolean>>;
    return {
      ...DEFAULT_VISIBLE_OPTIONAL_COLUMNS,
      ...Object.fromEntries(
        OPTIONAL_TRADE_COLUMNS.map((column) => [column.key, Boolean(parsed[column.key])])
      ),
    };
  } catch {
    return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
  }
}

function getTradeSortValue(trade: Trade, key: SortableTradeColumnKey): number | string | null {
  const entry = asNumber(trade.average_entry_price);
  const openQty = asNumber(trade.open_position_qty);
  const tp = asNumber(trade.target_price);
  const sl = asNumber(trade.stop_loss);

  const tpPct = computeTpPct(trade.side, entry, tp);
  const slPct = computeSlPct(trade.side, entry, sl);
  const tpAbs = computeTpAbs(trade.side, entry, tp, openQty);
  const slAbs = computeSlAbs(trade.side, entry, sl, openQty);

  switch (key) {
    case "date":
      return new Date(trade.created_at).getTime();
    case "symbol":
      return trade.symbol.toLowerCase();
    case "status":
      return trade.status.toLowerCase();
    case "side":
      return trade.side.toLowerCase();
    case "avgEntry":
      return trade.average_entry_price === undefined ? null : asNumber(trade.average_entry_price);
    case "avgExit":
      return trade.average_exit_price === undefined ? null : asNumber(trade.average_exit_price);
    case "entryTotal":
      return trade.entry_total === undefined ? null : asNumber(trade.entry_total);
    case "exitTotal":
      return trade.exit_total === undefined ? null : asNumber(trade.exit_total);
    case "openQty":
      return trade.open_position_qty === undefined ? null : asNumber(trade.open_position_qty);
    case "hold":
      return trade.hold_duration_hours === undefined ? null : asNumber(trade.hold_duration_hours);
    case "return":
      return trade.net_return === undefined ? null : asNumber(trade.net_return);
    case "returnPct":
      return trade.return_pct === undefined ? null : asNumber(trade.return_pct);
    case "tpPct":
      return tpPct === null ? null : tpPct;
    case "slPct":
      return slPct === null ? null : slPct;
    case "tpAbs":
      return tpAbs === null ? null : tpAbs;
    case "slAbs":
      return slAbs === null ? null : slAbs;
    default:
      return null;
  }
}

export function TradesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);
  const [quickCloseTradeId, setQuickCloseTradeId] = useState<number | null>(null);
  const [quickClosePrice, setQuickClosePrice] = useState<string>("");
  const [quickCloseReason, setQuickCloseReason] = useState<"manual" | "take_profit" | "stop_loss">("manual");
  const [quickCloseNote, setQuickCloseNote] = useState("");
  const [quickCloseError, setQuickCloseError] = useState<string | null>(null);
  const [recentSearch, setRecentSearch] = useState("");
  const [tradeSearch, setTradeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [recentSortConfig, setRecentSortConfig] = useState<{ key: SortableRecentExecutionColumnKey; direction: "asc" | "desc" }>({
    key: "date",
    direction: "desc",
  });
  const columnsMenuRef = useRef<HTMLDivElement | null>(null);
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState<Record<OptionalTradeColumnKey, boolean>>(
    loadVisibleOptionalColumns
  );
  const [sortConfig, setSortConfig] = useState<{ key: SortableTradeColumnKey; direction: "asc" | "desc" }>({
    key: "date",
    direction: "desc",
  });
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [hasLocalVisibleColumns] = useState(hasStoredVisibleOptionalColumns);

  const { data } = useQuery({
    queryKey: ["trades"],
    queryFn: () => api<Trade[]>("/api/trades"),
  });
  const { data: recentExecutions } = useQuery({
    queryKey: ["recent-executions"],
    queryFn: () => api<RecentExecution[]>("/api/trades/executions/recent?limit=12"),
  });
  const { data: userPreferences, isFetched: userPreferencesFetched } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () => api<UserPreferencesPayload>("/api/auth/preferences"),
  });

  const deleteTrade = useMutation({
    mutationFn: (tradeId: number) => api(`/api/trades/${tradeId}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteError(null);
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  const closeTrade = useMutation({
    mutationFn: (payload: { tradeId: number; price: number; close_reason: "manual" | "take_profit" | "stop_loss"; note?: string }) =>
      api(`/api/trades/${payload.tradeId}/close`, {
        method: "POST",
        body: JSON.stringify({
          executed_at: new Date().toISOString(),
          price: payload.price,
          close_reason: payload.close_reason,
          note: payload.note || null,
        }),
      }),
    onSuccess: () => {
      setQuickCloseTradeId(null);
      setQuickClosePrice("");
      setQuickCloseReason("manual");
      setQuickCloseNote("");
      setQuickCloseError(null);
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["recent-executions"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
    },
  });

  const savePreferences = useMutation({
    mutationFn: (payload: UserPreferencesPayload) =>
      api<UserPreferencesPayload>("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  });

  const parseApiError = (err: unknown): string => {
    if (err instanceof ApiError) {
      return err.message || t("trades.request_failed");
    }
    if (!(err instanceof Error)) {
      return t("trades.request_failed");
    }
    return err.message || t("trades.request_failed");
  };

  const filteredRecentExecutions = useMemo(() => {
    const term = recentSearch.trim().toLowerCase();
    if (!recentExecutions?.length || !term) {
      return recentExecutions ?? [];
    }
    return recentExecutions.filter((execution) => {
      const haystack = `${execution.trade_id} ${execution.trade_symbol} ${execution.action}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [recentExecutions, recentSearch]);

  const sortedRecentExecutions = useMemo(() => {
    const result = [...filteredRecentExecutions];
    result.sort((a, b) => {
      let aValue: number;
      let bValue: number;
      switch (recentSortConfig.key) {
        case "date":
          aValue = new Date(a.executed_at).getTime();
          bValue = new Date(b.executed_at).getTime();
          break;
        case "qty":
          aValue = asNumber(a.quantity);
          bValue = asNumber(b.quantity);
          break;
        case "price":
          aValue = asNumber(a.price);
          bValue = asNumber(b.price);
          break;
        case "fee":
          aValue = asNumber(a.fee);
          bValue = asNumber(b.fee);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      const comparison = aValue - bValue;
      return recentSortConfig.direction === "asc" ? comparison : -comparison;
    });
    return result;
  }, [filteredRecentExecutions, recentSortConfig]);

  const filteredTrades = useMemo(() => {
    if (!data?.length) {
      return [];
    }

    const term = tradeSearch.trim().toLowerCase();
    return data.filter((trade) => {
      if (statusFilter !== "all" && trade.status !== statusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = `${trade.id} ${trade.symbol} ${trade.side} ${trade.status}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [data, statusFilter, tradeSearch]);

  const quickCloseTrade = useMemo(() => {
    if (!quickCloseTradeId || !data?.length) {
      return null;
    }
    return data.find((trade) => trade.id === quickCloseTradeId) ?? null;
  }, [data, quickCloseTradeId]);

  useEffect(() => {
    if (!showColumnsMenu) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!columnsMenuRef.current) {
        return;
      }
      if (!columnsMenuRef.current.contains(event.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showColumnsMenu]);

  useEffect(() => {
    if (!userPreferencesFetched || preferencesHydrated) {
      return;
    }
    const profileColumns = userPreferences?.preferences?.trades?.visibleOptionalColumns;
    if (!hasLocalVisibleColumns && profileColumns && typeof profileColumns === "object") {
      setVisibleOptionalColumns((current) => ({
        ...current,
        ...Object.fromEntries(
          OPTIONAL_TRADE_COLUMNS.map((column) => [
            column.key,
            profileColumns[column.key] === undefined ? current[column.key] : Boolean(profileColumns[column.key]),
          ])
        ),
      }));
    }
    setPreferencesHydrated(true);
  }, [hasLocalVisibleColumns, preferencesHydrated, userPreferences, userPreferencesFetched]);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }
    try {
      window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleOptionalColumns));
    } catch {
      // Ignore localStorage failures and keep runtime state.
    }
    savePreferences.mutate({
      preferences: {
        trades: {
          visibleOptionalColumns,
        },
      },
    });
  }, [preferencesHydrated, savePreferences, visibleOptionalColumns]);

  const visibleOptionalCount = useMemo(
    () => OPTIONAL_TRADE_COLUMNS.filter((column) => visibleOptionalColumns[column.key]).length,
    [visibleOptionalColumns]
  );

  const sortedTrades = useMemo(() => {
    const result = [...filteredTrades];
    result.sort((a, b) => {
      const aValue = getTradeSortValue(a, sortConfig.key);
      const bValue = getTradeSortValue(b, sortConfig.key);

      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1;
      }
      if (bValue === null) {
        return -1;
      }

      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), "it");
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
    return result;
  }, [filteredTrades, sortConfig]);

  const toggleSort = (key: SortableTradeColumnKey) => {
    setSortConfig((previous) => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: key === "date" ? "desc" : "asc",
      };
    });
  };

  const sortIndicator = (key: SortableTradeColumnKey): string => {
    if (sortConfig.key !== key) {
      return "";
    }
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const toggleRecentSort = (key: SortableRecentExecutionColumnKey) => {
    setRecentSortConfig((previous) => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: key === "date" ? "desc" : "asc",
      };
    });
  };

  const recentSortIndicator = (key: SortableRecentExecutionColumnKey): string => {
    if (recentSortConfig.key !== key) {
      return "";
    }
    return recentSortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("trades.title")}</h1>
        <p className="text-sm text-slate-400">{t("trades.subtitle")}</p>
      </div>

      <section className="card overflow-x-auto">
        <div className="flex flex-col gap-2 border-b border-slate-700/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold">{t("trades.recent_executions")}</div>
          <input
            value={recentSearch}
            onChange={(event) => setRecentSearch(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:max-w-xs"
            placeholder={t("trades.search_recent_placeholder")}
          />
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleRecentSort("date")} className="text-left hover:text-slate-200">
                  {t("trades.columns.date")}{recentSortIndicator("date")}
                </button>
              </th>
              <th className="px-3 py-2">{t("trades.columns.trade")}</th>
              <th className="px-3 py-2">{t("trades.columns.action")}</th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleRecentSort("qty")} className="text-left hover:text-slate-200">
                  {t("trades.columns.qty")}{recentSortIndicator("qty")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleRecentSort("price")} className="text-left hover:text-slate-200">
                  {t("trades.columns.price")}{recentSortIndicator("price")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleRecentSort("fee")} className="text-left hover:text-slate-200">
                  {t("trades.columns.fee")}{recentSortIndicator("fee")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecentExecutions.length ? (
              sortedRecentExecutions.map((execution) => (
                <tr key={execution.id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{new Date(execution.executed_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/trades/${execution.trade_id}`)}
                      className="text-teal-200 underline-offset-2 hover:underline"
                    >
                      #{execution.trade_id} - {execution.trade_symbol}
                    </button>
                  </td>
                  <td className="px-3 py-2">{execution.action}</td>
                  <td className="px-3 py-2">{formatMetric(execution.quantity)}</td>
                  <td className="px-3 py-2">{formatMoney(execution.price, execution.currency)}</td>
                  <td className="px-3 py-2">{formatMoney(execution.fee, execution.currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-2 text-slate-400">
                  {t("trades.no_recent_executions")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <div className="flex flex-col gap-2 border-b border-slate-700/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold">{t("trades.title")}</div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <input
              value={tradeSearch}
              onChange={(event) => setTradeSearch(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:w-64"
              placeholder={t("trades.search_placeholder")}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="all">{t("trades.all_statuses")}</option>
              <option value="open">{t("trades.status.open")}</option>
              <option value="partial">{t("trades.status.partial")}</option>
              <option value="close">{t("trades.status.close")}</option>
            </select>
            <div className="relative" ref={columnsMenuRef}>
              <button
                type="button"
                onClick={() => setShowColumnsMenu((value) => !value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                {t("trades.visible_columns")}
              </button>
              {showColumnsMenu ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded border border-slate-700 bg-slate-950 p-3 shadow-2xl">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("trades.show_hide")}</div>
                  <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
                    {OPTIONAL_TRADE_COLUMNS.map((column) => (
                      <label key={column.key} className="flex items-center gap-2 text-xs text-slate-200">
                        <input
                          type="checkbox"
                          checked={visibleOptionalColumns[column.key]}
                          onChange={(event) =>
                            setVisibleOptionalColumns((current) => ({
                              ...current,
                              [column.key]: event.target.checked,
                            }))
                          }
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {quickCloseTrade ? (
          <div className="border-b border-slate-700/80 bg-slate-900/40 px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-amber-200">
              {t("trades.quick_close_title", { id: quickCloseTrade.id, symbol: quickCloseTrade.symbol })}
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <input
                type="number"
                step="0.000001"
                value={quickClosePrice}
                onChange={(event) => setQuickClosePrice(event.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder={t("trades.exit_price")}
              />
              <select
                value={quickCloseReason}
                onChange={(event) => setQuickCloseReason(event.target.value as "manual" | "take_profit" | "stop_loss")}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="manual">{t("trades.manual")}</option>
                <option value="take_profit">{t("trades.status.take_profit")}</option>
                <option value="stop_loss">{t("trades.status.stop_loss")}</option>
              </select>
              <input
                value={quickCloseNote}
                onChange={(event) => setQuickCloseNote(event.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder={t("trades.note_optional")}
              />
              <button
                type="button"
                onClick={async () => {
                  setQuickCloseError(null);
                  const parsedPrice = Number(quickClosePrice);
                  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
                    setQuickCloseError(t("trades.invalid_exit_price"));
                    return;
                  }
                  try {
                    await closeTrade.mutateAsync({
                      tradeId: quickCloseTrade.id,
                      price: parsedPrice,
                      close_reason: quickCloseReason,
                      note: quickCloseNote,
                    });
                  } catch (err) {
                    setQuickCloseError(parseApiError(err));
                  }
                }}
                disabled={closeTrade.isPending}
                className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                {closeTrade.isPending ? t("trades.closing") : t("trades.confirm_close")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCloseTradeId(null);
                  setQuickCloseError(null);
                }}
                className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
              >
                {t("common.cancel")}
              </button>
            </div>
            {quickCloseError ? <div className="mt-2 text-sm text-red-400">{quickCloseError}</div> : null}
          </div>
        ) : null}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("date")} className="text-left hover:text-slate-200">
                  {t("trades.columns.date")}{sortIndicator("date")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("symbol")} className="text-left hover:text-slate-200">
                  {t("trades.columns.symbol")}{sortIndicator("symbol")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("status")} className="text-left hover:text-slate-200">
                  {t("trades.columns.status")}{sortIndicator("status")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("side")} className="text-left hover:text-slate-200">
                  {t("trades.columns.side")}{sortIndicator("side")}
                </button>
              </th>
              {visibleOptionalColumns.avgEntry ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("avgEntry")} className="text-left hover:text-slate-200">
                    Avg Entry{sortIndicator("avgEntry")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.avgExit ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("avgExit")} className="text-left hover:text-slate-200">
                    Avg Exit{sortIndicator("avgExit")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.entryTotal ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("entryTotal")} className="text-left hover:text-slate-200">
                    Entry Total{sortIndicator("entryTotal")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.exitTotal ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("exitTotal")} className="text-left hover:text-slate-200">
                    Exit Total{sortIndicator("exitTotal")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.openQty ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("openQty")} className="text-left hover:text-slate-200">
                    Open Qty{sortIndicator("openQty")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.hold ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("hold")} className="text-left hover:text-slate-200">
                    Hold{sortIndicator("hold")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.return ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("return")} className="text-left hover:text-slate-200">
                    Return{sortIndicator("return")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.returnPct ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("returnPct")} className="text-left hover:text-slate-200">
                    Return %{sortIndicator("returnPct")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.tpPct ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("tpPct")} className="text-left hover:text-slate-200">
                    TP %{sortIndicator("tpPct")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.slPct ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("slPct")} className="text-left hover:text-slate-200">
                    SL %{sortIndicator("slPct")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.tpAbs ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("tpAbs")} className="text-left hover:text-slate-200">
                    TP Assoluto{sortIndicator("tpAbs")}
                  </button>
                </th>
              ) : null}
              {visibleOptionalColumns.slAbs ? (
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("slAbs")} className="text-left hover:text-slate-200">
                    SL Assoluto{sortIndicator("slAbs")}
                  </button>
                </th>
              ) : null}
              <th className="px-3 py-2">{t("trades.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade) => {
              const entry = asNumber(trade.average_entry_price);
              const openQty = asNumber(trade.open_position_qty);
              const tp = asNumber(trade.target_price);
              const sl = asNumber(trade.stop_loss);

              const tpPct = computeTpPct(trade.side, entry, tp);
              const slPct = computeSlPct(trade.side, entry, sl);
              const tpAbs = computeTpAbs(trade.side, entry, tp, openQty);
              const slAbs = computeSlAbs(trade.side, entry, sl, openQty);

              return (
              <tr key={trade.id} className="border-b border-slate-800/80">
                <td
                  className="cursor-pointer px-3 py-2 hover:text-teal-300"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  title={t("trades.view_trade") ?? "Visualizza trade"}
                >
                  {new Date(trade.created_at).toLocaleDateString()}
                </td>
                <td
                  className="cursor-pointer px-3 py-2 font-semibold text-teal-200 hover:text-teal-100 hover:underline"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  title={t("trades.view_trade") ?? "Visualizza trade"}
                >
                  {trade.symbol}
                </td>
                <td className="px-3 py-2">{trade.status}</td>
                <td className="px-3 py-2">{trade.side}</td>
                {visibleOptionalColumns.avgEntry ? <td className="px-3 py-2">{formatMoney(trade.average_entry_price, trade.account_currency)}</td> : null}
                {visibleOptionalColumns.avgExit ? <td className="px-3 py-2">{formatMoney(trade.average_exit_price, trade.account_currency)}</td> : null}
                {visibleOptionalColumns.entryTotal ? <td className="px-3 py-2">{formatMoney(trade.entry_total, trade.account_currency)}</td> : null}
                {visibleOptionalColumns.exitTotal ? <td className="px-3 py-2">{formatMoney(trade.exit_total, trade.account_currency)}</td> : null}
                {visibleOptionalColumns.openQty ? <td className="px-3 py-2">{formatMetric(trade.open_position_qty)}</td> : null}
                {visibleOptionalColumns.hold ? <td className="px-3 py-2">{formatHoldHours(trade.hold_duration_hours)}</td> : null}
                {visibleOptionalColumns.return ? (
                  <td
                    className={`px-3 py-2 ${
                      trade.net_return === undefined
                        ? "text-slate-300"
                        : asNumber(trade.net_return) >= 0
                          ? "text-emerald-300"
                          : "text-red-400"
                    }`}
                  >
                    {formatMoney(trade.net_return, trade.account_currency)}
                  </td>
                ) : null}
                {visibleOptionalColumns.returnPct ? (
                  <td
                    className={`px-3 py-2 ${
                      trade.return_pct === undefined
                        ? "text-slate-300"
                        : asNumber(trade.return_pct) >= 0
                          ? "text-emerald-300"
                          : "text-red-400"
                    }`}
                  >
                    {formatMetric(trade.return_pct)}%
                  </td>
                ) : null}
                {visibleOptionalColumns.tpPct ? <td className="px-3 py-2 text-emerald-300">{tpPct === null ? "-" : `${tpPct.toFixed(2)}%`}</td> : null}
                {visibleOptionalColumns.slPct ? <td className="px-3 py-2 text-red-300">{slPct === null ? "-" : `${slPct.toFixed(2)}%`}</td> : null}
                {visibleOptionalColumns.tpAbs ? <td className="px-3 py-2 text-emerald-300">{tpAbs === null ? "-" : formatMoney(tpAbs, trade.account_currency)}</td> : null}
                {visibleOptionalColumns.slAbs ? <td className="px-3 py-2 text-red-300">{slAbs === null ? "-" : formatMoney(slAbs, trade.account_currency)}</td> : null}
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                      className="rounded bg-slate-700 p-2 text-white"
                      title={t("trades.view_detail")}
                      aria-label={t("trades.view_detail")}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/trades/${trade.id}/edit`)}
                      className="rounded bg-sky-500 p-2 text-slate-950"
                      title={t("trades.edit_trade")}
                      aria-label={t("trades.edit_trade")}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/trades/${trade.id}/images`)}
                      className="rounded bg-indigo-500 p-2 text-white"
                      title={t("trades.manage_images")}
                      aria-label={t("trades.manage_images")}
                    >
                      <ImageIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCloseError(null);
                        setQuickCloseTradeId(trade.id);
                        setQuickCloseReason("manual");
                        setQuickCloseNote("");
                        const suggestedPrice = asNumber(trade.target_price) > 0 ? asNumber(trade.target_price) : asNumber(trade.average_entry_price);
                        setQuickClosePrice(suggestedPrice > 0 ? String(suggestedPrice) : "");
                      }}
                      disabled={trade.status === "close"}
                      className="rounded bg-amber-500 p-2 text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      title={t("trades.quick_close")}
                      aria-label={t("trades.quick_close")}
                    >
                      <CloseIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletePendingId(trade.id);
                      }}
                      className="rounded bg-red-500 p-2 text-white"
                      title={t("trades.delete_trade")}
                      aria-label={t("trades.delete_trade")}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            );})}
            {!filteredTrades.length ? (
              <tr>
                <td colSpan={5 + visibleOptionalCount} className="px-3 py-2 text-slate-400">
                  {t("trades.no_trades")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {deleteError ? <div className="p-3 text-sm text-red-400">{deleteError}</div> : null}
      </section>
      {deletePendingId !== null && (() => {
        const trade = data?.find((tr) => tr.id === deletePendingId);
        return (
          <ConfirmModal
            message={t("trades.delete_confirm", { id: deletePendingId, symbol: trade?.symbol ?? "" })}
            onConfirm={async () => {
              try {
                await deleteTrade.mutateAsync(deletePendingId);
                qc.invalidateQueries({ queryKey: ["recent-executions"] });
              } catch (err) {
                setDeleteError(parseApiError(err));
              } finally {
                setDeletePendingId(null);
              }
            }}
            onCancel={() => setDeletePendingId(null)}
            isPending={deleteTrade.isPending}
          />
        );
      })()}
    </div>
  );
}
