import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Account, Broker, Ticker, Trade, api, tickersApi } from "../lib/api";

const createTradeModalSchema = (t: (key: string) => string) =>
  z.object({
    account_id: z.coerce.number().int().positive(t("trades.new_trade.validation.account_required")),
    symbol: z.string().trim().min(1, t("trades.new_trade.validation.symbol_required")),
    quantity: z.coerce.number().positive(t("trades.new_trade.validation.quantity_positive")),
    direction: z.enum(["long", "short"]),
    execution_type: z.enum(["open", "close", "partial"]),
    entry_price: z.coerce.number().positive(t("trades.new_trade.validation.entry_price_positive")),
    take_profit: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().positive(t("trades.new_trade.validation.take_profit_positive")).optional()
    ),
    stop_loss: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().positive(t("trades.new_trade.validation.stop_loss_positive")).optional()
    ),
  });

type TradeModalPayload = z.infer<ReturnType<typeof createTradeModalSchema>>;

type Props = {
  open: boolean;
  onClose: () => void;
};

function inferAction(direction: "long" | "short", executionType: "open" | "close" | "partial") {
  if (executionType === "open") {
    return direction === "long" ? "BUY" : "SELL";
  }
  return direction === "long" ? "SELL" : "BUY";
}

function FieldHelp({ text, align = "center" }: { text: string; align?: "center" | "start" }) {
  const tooltipPos =
    align === "start"
      ? "left-0 -translate-x-0"
      : "left-1/2 -translate-x-1/2";
  return (
    <span className="group relative ml-1 inline-flex">
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] font-semibold text-slate-300 dark:text-slate-900 outline-none ring-teal-400/70 transition focus:ring-2"
        aria-label={text}
      >
        ?
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${tooltipPos} top-full z-30 mt-2 w-56 rounded border border-slate-600 bg-slate-800 dark:bg-slate-100 px-2 py-1 text-xs leading-snug text-slate-100 dark:text-slate-900 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {text}
      </span>
    </span>
  );
}

export function TradeCreateModal({ open, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const tradeModalSchema = useMemo(() => createTradeModalSchema(t), [t]);
  const qc = useQueryClient();

  // Symbol autocomplete state
  const [symbolInput, setSymbolInput] = useState("");
  const [symbolSuggestions, setSymbolSuggestions] = useState<Ticker[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const symbolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (symbolContainerRef.current && !symbolContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSymbolInput(value: string) {
    setSymbolInput(value);
    setValue("symbol", value.toUpperCase());
    if (symbolDebounceRef.current) clearTimeout(symbolDebounceRef.current);
    if (value.trim().length < 1) {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    symbolDebounceRef.current = setTimeout(async () => {
      const results = await tickersApi.search(value, 8);
      setSymbolSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }

  function selectSymbol(ticker: Ticker) {
    setSymbolInput(ticker.symbol);
    setValue("symbol", ticker.symbol, { shouldValidate: true });
    setShowSuggestions(false);
  }

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<Account[]>("/api/accounts"),
    enabled: open,
  });
  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => api<Broker[]>("/api/brokers"),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TradeModalPayload>({
    resolver: zodResolver(tradeModalSchema),
    defaultValues: {
      account_id: 0,
      symbol: "",
      quantity: 1,
      direction: "long",
      execution_type: "open",
      entry_price: 0,
      take_profit: undefined,
      stop_loss: undefined,
    },
  });

  const createTrade = useMutation({
    mutationFn: async (values: TradeModalPayload) => {
      const createdTrade = await api<Trade>("/api/trades", {
        method: "POST",
        body: JSON.stringify({
          account_id: values.account_id,
          market: "Euronext",
          symbol: values.symbol,
          instrument_type: "stock",
          side: values.direction,
          status: values.execution_type === "open" ? "open" : values.execution_type,
          target_price: values.take_profit && values.take_profit > 0 ? values.take_profit : null,
          stop_loss: values.stop_loss && values.stop_loss > 0 ? values.stop_loss : null,
          tags: [],
        }),
      });

      await api(`/api/trades/${createdTrade.id}/executions`, {
        method: "POST",
        body: JSON.stringify({
          action: inferAction(values.direction, values.execution_type),
          executed_at: new Date().toISOString(),
          quantity: values.quantity,
          price: values.entry_price,
          currency: "EUR",
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["recent-executions"] });
      reset();
      setSymbolInput("");
      setSymbolSuggestions([]);
      onClose();
    },
  });

  const entryPrice = watch("entry_price");
  const takeProfit = watch("take_profit");
  const stopLoss = watch("stop_loss");
  const direction = watch("direction");
  const accountId = watch("account_id");
  const quantity = watch("quantity");
  const numberLocale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";

  const estimatedFee = useMemo(() => {
    if (!accounts?.length || !brokers?.length || !accountId || accountId <= 0 || !entryPrice || !quantity) {
      return null;
    }
    const account = accounts.find((item) => item.id === accountId);
    if (!account?.broker_id) {
      return null;
    }
    const broker = brokers.find((item) => item.id === account.broker_id);
    if (!broker) {
      return null;
    }
    const feeValue = Number(broker.fee_value || 0);
    if (!Number.isFinite(feeValue) || feeValue < 0) {
      return null;
    }
    if (broker.fee_mode === "percent") {
      const notional = Number(entryPrice) * Number(quantity);
      return {
        value: (notional * feeValue) / 100,
        currency: (broker.fee_currency || account.base_currency || "EUR").toUpperCase(),
      };
    }
    return {
      value: feeValue,
      currency: (broker.fee_currency || account.base_currency || "EUR").toUpperCase(),
    };
  }, [accountId, accounts, brokers, entryPrice, quantity]);

  const tpPct = useMemo(() => {
    if (!entryPrice || !takeProfit || entryPrice <= 0 || takeProfit <= 0) {
      return null;
    }
    return ((takeProfit - entryPrice) / entryPrice) * 100;
  }, [entryPrice, takeProfit]);

  const slPct = useMemo(() => {
    if (!entryPrice || !stopLoss || entryPrice <= 0 || stopLoss <= 0) {
      return null;
    }
    if (direction === "long") {
      return ((entryPrice - stopLoss) / entryPrice) * 100;
    }
    return ((stopLoss - entryPrice) / entryPrice) * 100;
  }, [direction, entryPrice, stopLoss]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 dark:bg-slate-100/90 p-4">
      <div className="w-full max-w-xl overflow-y-auto rounded-xl border border-slate-700 dark:border-slate-300 bg-slate-900 dark:bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-100 dark:text-slate-900">{t("trades.new_trade.title")}</h2>
          <p className="text-sm text-slate-400 dark:text-slate-900">{t("trades.new_trade.subtitle")}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit((values) => createTrade.mutate(values))}>

          {/* Account + Simbolo */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.account")}
                <FieldHelp text={t("trades.new_trade.tooltips.account")} align="start" />
              </span>
              <select
                {...register("account_id", { valueAsNumber: true })}
                className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2"
              >
                <option value={0}>{t("trades.new_trade.placeholders.select_account")}</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              {errors.account_id ? <span className="mt-1 block text-xs text-red-300">{errors.account_id.message}</span> : null}
            </label>
            <div className="text-sm text-slate-300 dark:text-slate-900" ref={symbolContainerRef}>
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.symbol")}
                <FieldHelp text={t("trades.new_trade.tooltips.symbol")} />
              </span>
              {/* Hidden field for react-hook-form validation */}
              <input type="hidden" {...register("symbol")} />
              <div className="relative">
                <input
                  type="text"
                  value={symbolInput}
                  onChange={(e) => handleSymbolInput(e.target.value)}
                  onFocus={() => symbolSuggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2 uppercase"
                  placeholder={t("trades.new_trade.placeholders.symbol")}
                  autoComplete="off"
                />
                {showSuggestions && (
                  <ul className="absolute left-0 top-full z-50 mt-1 w-full max-h-48 overflow-y-auto rounded border border-slate-600 dark:border-slate-300 bg-slate-900 dark:bg-white shadow-xl">
                    {symbolSuggestions.map((tk) => (
                      <li
                        key={tk.id}
                        onMouseDown={() => selectSymbol(tk)}
                        className="flex cursor-pointer items-baseline gap-2 px-3 py-2 hover:bg-slate-700/60 dark:hover:bg-slate-100"
                      >
                        <span className="font-mono font-semibold text-teal-400 dark:text-teal-700 text-sm shrink-0">
                          {tk.symbol}
                        </span>
                        <span className="truncate text-xs text-slate-300 dark:text-slate-600">
                          {tk.name}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                          {tk.market}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errors.symbol ? <span className="mt-1 block text-xs text-red-300">{errors.symbol.message}</span> : null}
            </div>
          </div>

          {/* Quantità + Prezzo ingresso */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.quantity")}
                <FieldHelp text={t("trades.new_trade.tooltips.quantity")} align="start" />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("quantity")}
                className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2"
              />
              {errors.quantity ? <span className="mt-1 block text-xs text-red-300">{errors.quantity.message}</span> : null}
            </label>
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.entry_price")}
                <FieldHelp text={t("trades.new_trade.tooltips.entry_price")} />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("entry_price")}
                className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2"
              />
              {errors.entry_price ? <span className="mt-1 block text-xs text-red-300">{errors.entry_price.message}</span> : null}
            </label>
          </div>

          {/* Direzione + Fee automatica */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.direction")}
                <FieldHelp text={t("trades.new_trade.tooltips.direction")} align="start" />
              </span>
              <select {...register("direction")} className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2">
                <option value="long">{t("trades.new_trade.options.direction.long")}</option>
                <option value="short">{t("trades.new_trade.options.direction.short")}</option>
              </select>
            </label>
            <div className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.auto_fee")}
                <FieldHelp text={t("trades.new_trade.tooltips.auto_fee")} />
              </span>
              <div className="rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2 text-slate-200 dark:text-slate-900">
                {estimatedFee === null
                  ? "-"
                  : `${estimatedFee.value.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${estimatedFee.currency}`}
              </div>
              <span className="mt-1 block text-xs text-slate-400 dark:text-slate-900">{t("trades.new_trade.estimated_fee_note")}</span>
            </div>
          </div>

          {/* Take Profit */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.take_profit")}
                <FieldHelp text={t("trades.new_trade.tooltips.take_profit")} align="start" />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("take_profit")}
                className="w-full rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-emerald-200"
              />
              {errors.take_profit ? <span className="mt-1 block text-xs text-red-300">{errors.take_profit.message}</span> : null}
            </label>
            <div className="flex items-end">
              <div className="w-full rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {t("trades.new_trade.metrics.tp_pct")} {tpPct === null ? "-" : tpPct.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.stop_loss")}
                <FieldHelp text={t("trades.new_trade.tooltips.stop_loss")} align="start" />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("stop_loss")}
                className="w-full rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-red-200"
              />
              {errors.stop_loss ? <span className="mt-1 block text-xs text-red-300">{errors.stop_loss.message}</span> : null}
            </label>
            <div className="flex items-end">
              <div className="w-full rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {t("trades.new_trade.metrics.sl_pct")} {slPct === null ? "-" : slPct.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Errori */}
          {Object.keys(errors).length > 0 ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {t("trades.new_trade.errors.fix_fields")}
            </div>
          ) : null}
          {createTrade.error ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {t("trades.new_trade.errors.create_failed")}
            </div>
          ) : null}

          {/* Footer: Eseguito + Bottoni */}
          <div className="flex items-end gap-3">
            <label className="flex-1 text-sm text-slate-300 dark:text-slate-900">
              <span className="inline-flex items-center mb-1">
                {t("trades.new_trade.labels.execution")}
                <FieldHelp text={t("trades.new_trade.tooltips.execution_type")} align="start" />
              </span>
              <select {...register("execution_type")} className="w-full rounded border border-slate-700 dark:border-slate-300 bg-slate-950 dark:bg-white px-3 py-2">
                <option value="open">{t("trades.new_trade.options.execution.open")}</option>
                <option value="partial">{t("trades.new_trade.options.execution.partial")}</option>
                <option value="close">{t("trades.new_trade.options.execution.close")}</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-700 dark:bg-slate-200 dark:text-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 dark:text-slate-900"
            >
              {t("trades.new_trade.cancel")}
            </button>
            <button
              type="submit"
              disabled={createTrade.isPending}
              className="rounded bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {createTrade.isPending ? t("trades.new_trade.saving") : t("trades.new_trade.save")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
