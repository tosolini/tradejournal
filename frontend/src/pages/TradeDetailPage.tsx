import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { Account, Broker, TradeDetail, api, fetchTradeImageBlobUrl } from "../lib/api";

const closeTradeSchema = z.object({
  executed_at: z.string().min(1),
  price: z.coerce.number().positive("Inserisci un prezzo di uscita valido"),
  close_reason: z.enum(["manual", "take_profit", "stop_loss"]),
  note: z.string().optional(),
});

type CloseTradePayload = z.infer<typeof closeTradeSchema>;

function formatMetric(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return "-";
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return "-";
  }
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoney(value: string | number | undefined, currency?: string): string {
  if (value === undefined || value === null) {
    return "-";
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return "-";
  }
  const normalized = (currency || "").trim().toUpperCase();
  if (!normalized) {
    return formatMetric(n);
  }
  try {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: normalized }).format(n);
  } catch {
    return `${formatMetric(n)} ${normalized}`;
  }
}

function asNumber(value: string | number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function estimateExecutionFee(mode: string | undefined, feeValue: string | number | undefined, quantity: number, price: number): number {
  const normalizedMode = (mode || "fixed").toLowerCase();
  const parsedFee = Number(feeValue || 0);
  if (!Number.isFinite(parsedFee) || quantity <= 0 || price <= 0) {
    return 0;
  }
  if (normalizedMode === "percent") {
    return (quantity * price * parsedFee) / 100;
  }
  return parsedFee;
}

function datetimeLocalNow(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function TradeDetailPage() {
  const params = useParams<{ tradeId: string }>();
  const tradeId = Number(params.tradeId || 0);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["trade-detail", tradeId],
    queryFn: () => api<TradeDetail>(`/api/trades/${tradeId}`),
    enabled: tradeId > 0,
  });
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<Account[]>("/api/accounts"),
  });
  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => api<Broker[]>('/api/brokers'),
  });
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const closeForm = useForm<CloseTradePayload>({
    resolver: zodResolver(closeTradeSchema),
    defaultValues: {
      executed_at: datetimeLocalNow(),
      price: 0,
      close_reason: "manual",
      note: "",
    },
  });

  const closeTrade = useMutation({
    mutationFn: async (values: CloseTradePayload) =>
      api(`/api/trades/${tradeId}/close`, {
        method: "POST",
        body: JSON.stringify({
          executed_at: datetimeLocalToIso(values.executed_at),
          price: values.price,
          close_reason: values.close_reason,
          note: values.note,
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["trade-detail", tradeId] });
      await qc.invalidateQueries({ queryKey: ["trades"] });
      await qc.invalidateQueries({ queryKey: ["recent-executions"] });
    },
  });

  useEffect(() => {
    if (!data || data.trade.status === "close") {
      return;
    }
    closeForm.reset({
      executed_at: datetimeLocalNow(),
      price: Number(data.trade.average_exit_price || data.trade.target_price || data.trade.average_entry_price || 0),
      close_reason: "manual",
      note: "",
    });
  }, [closeForm, data]);

  useEffect(() => {
    const previousUrls = Object.values(thumbnailUrls);
    let cancelled = false;

    const loadThumbnails = async () => {
      if (!data?.images.length) {
        setThumbnailUrls({});
        return;
      }

      const entries = await Promise.all(
        data.images.map(async (image) => {
          const variant = image.annotated_path ? "annotated" : "original";
          try {
            const url = await fetchTradeImageBlobUrl(image.id, variant);
            return [image.id, url] as const;
          } catch {
            return [image.id, ""] as const;
          }
        })
      );

      if (cancelled) {
        for (const [, url] of entries) {
          if (url) {
            URL.revokeObjectURL(url);
          }
        }
        return;
      }

      const next: Record<number, string> = {};
      for (const [id, url] of entries) {
        if (url) {
          next[id] = url;
        }
      }
      setThumbnailUrls(next);

      for (const url of previousUrls) {
        URL.revokeObjectURL(url);
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [data?.images]);

  const tradeData = data?.trade;
  const entryPrice = asNumber(tradeData?.average_entry_price);
  const openQty = asNumber(tradeData?.open_position_qty);
  const tpValue = asNumber(tradeData?.target_price);
  const slValue = asNumber(tradeData?.stop_loss);
  const account = accounts?.find((item) => item.id === tradeData?.account_id);
  const broker = account?.broker_id ? brokers?.find((item) => item.id === account.broker_id) : undefined;
  const capitalGainRate = asNumber(broker?.capital_gain_rate ?? 26);
  const closeReasonLabel = {
    manual: "Manuale",
    take_profit: "Take Profit",
    stop_loss: "Stop Loss",
  } as const;

  const estimatedTpFee = useMemo(() => estimateExecutionFee(broker?.fee_mode, broker?.fee_value, openQty, tpValue), [broker?.fee_mode, broker?.fee_value, openQty, tpValue]);
  const estimatedSlFee = useMemo(() => estimateExecutionFee(broker?.fee_mode, broker?.fee_value, openQty, slValue), [broker?.fee_mode, broker?.fee_value, openQty, slValue]);
  const tpAbs = tradeData ? computeTpAbs(tradeData.side, entryPrice, tpValue, openQty) : null;
  const slAbs = tradeData ? computeSlAbs(tradeData.side, entryPrice, slValue, openQty) : null;
  const estimatedCapitalGainTax = tpAbs === null || tpAbs <= 0 ? 0 : (tpAbs * capitalGainRate) / 100;
  const netTpAfterFees = tpAbs === null ? null : tpAbs - estimatedTpFee - estimatedCapitalGainTax;
  const netSlAfterFees = slAbs === null ? null : slAbs + estimatedSlFee;
  const closeSummary = data?.closure;
  const tpPct = tradeData ? computeTpPct(tradeData.side, entryPrice, tpValue) : null;
  const slPct = tradeData ? computeSlPct(tradeData.side, entryPrice, slValue) : null;
  const closeNetAfterTax = closeSummary
    ? closeSummary.capital_gain_tax_estimate === null || closeSummary.capital_gain_tax_estimate === undefined
      ? null
      : Number(closeSummary.net_pnl || 0) - Number(closeSummary.capital_gain_tax_estimate || 0)
    : null;

  if (!tradeId) {
    return <div className="text-sm text-red-400">Trade non valido.</div>;
  }

  if (isLoading) {
    return <div className="text-sm text-slate-400">Caricamento trade...</div>;
  }

  if (error || !data) {
    return <div className="text-sm text-red-400">Dettaglio trade non disponibile.</div>;
  }

  const trade = data.trade;
  const executions = data.executions;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trade #{trade.id}</h1>
          <p className="text-sm text-slate-400">Vista dettagliata in sola lettura.</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/trades/${trade.id}/edit`} className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950">
            Modifica
          </Link>
          <Link to={`/trades/${trade.id}/images`} className="rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white">
            Immagini
          </Link>
        </div>
      </div>

      <section className="card grid gap-3 p-4 md:grid-cols-4">
        <div>
          <div className="text-xs text-slate-400">Symbol</div>
          <div className="font-semibold text-teal-200">{trade.symbol}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Direction</div>
          <div>{trade.side}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Status</div>
          <div>{trade.status}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Account</div>
          <div>{trade.account_id}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Take Profit</div>
          <div>{formatMoney(trade.target_price, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">TP % Ipotizzato</div>
          <div className="text-emerald-300">{tpPct === null ? "-" : `${tpPct.toFixed(2)}%`}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Stop Loss</div>
          <div className="text-red-300">{formatMoney(trade.stop_loss, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">SL % Ipotizzato</div>
          <div className="text-red-300">{slPct === null ? "-" : `${slPct.toFixed(2)}%`}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">TP Assoluto (potenziale)</div>
          <div className="text-emerald-300">{tpAbs === null ? "-" : formatMoney(tpAbs, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">TP netto</div>
          <div className="text-emerald-300">{netTpAfterFees === null ? "-" : formatMoney(netTpAfterFees, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">SL Assoluto (rischio)</div>
          <div className="text-red-300">{slAbs === null ? "-" : formatMoney(slAbs, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">SL netto dopo fee</div>
          <div className="text-red-300">{netSlAfterFees === null ? "-" : formatMoney(netSlAfterFees, trade.account_currency)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Return</div>
          <div className={Number(trade.net_return || 0) >= 0 ? "text-emerald-300" : "text-red-400"}>
            {formatMoney(trade.net_return, trade.account_currency)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Return %</div>
          <div className={Number(trade.return_pct || 0) >= 0 ? "text-emerald-300" : "text-red-400"}>
            {formatMetric(trade.return_pct)}%
          </div>
        </div>
      </section>

      {trade.status === "close" && closeSummary ? (
        <section className="card p-4">
          <div className="mb-3 text-lg font-semibold">Riepilogo Chiusura</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs text-slate-400">Chiuso il</div>
              <div>{new Date(closeSummary.closed_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Motivo</div>
              <div>{closeReasonLabel[(closeSummary.close_reason || "manual") as keyof typeof closeReasonLabel] ?? closeSummary.close_reason ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Exit action</div>
              <div>{closeSummary.exit_action}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Exit price</div>
              <div>{formatMoney(closeSummary.exit_price, closeSummary.exit_currency)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Exit fee</div>
              <div>{formatMoney(closeSummary.exit_fee, closeSummary.exit_currency)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Gross PnL</div>
              <div className="text-teal-200">{formatMoney(closeSummary.gross_pnl, trade.account_currency)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Fee totali</div>
              <div>{formatMoney(closeSummary.total_fees, trade.account_currency)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Net PnL post fee</div>
              <div className={Number(closeSummary.net_pnl || 0) >= 0 ? "text-emerald-300" : "text-red-300"}>
                {formatMoney(closeSummary.net_pnl, trade.account_currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Capital gain</div>
              <div>{closeSummary.capital_gain_mode} {Number(closeSummary.capital_gain_rate || 0).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Tax estimate</div>
              <div>{closeSummary.capital_gain_tax_estimate === null || closeSummary.capital_gain_tax_estimate === undefined ? "-" : formatMoney(closeSummary.capital_gain_tax_estimate, trade.account_currency)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Net PnL post tax</div>
              <div className={closeNetAfterTax === null ? "" : closeNetAfterTax >= 0 ? "text-emerald-300" : "text-red-300"}>
                {closeNetAfterTax === null ? "-" : formatMoney(closeNetAfterTax, trade.account_currency)}
              </div>
            </div>
          </div>
          {closeSummary.tax_note ? <div className="mt-3 text-sm text-slate-400">{closeSummary.tax_note}</div> : null}
        </section>
      ) : null}

      {trade.status !== "close" ? (
        <section className="card p-4">
          <div className="mb-3 text-lg font-semibold">Chiudi Trade</div>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={closeForm.handleSubmit((values) => closeTrade.mutate(values))}>
            <label className="text-sm text-slate-300">
              Data/Ora uscita
              <input type="datetime-local" {...closeForm.register("executed_at")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-300">
              Prezzo reale di uscita
              <input type="number" step="0.000001" {...closeForm.register("price")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-300">
              Motivo chiusura
              <select {...closeForm.register("close_reason")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2">
                <option value="manual">Manuale</option>
                <option value="take_profit">Take Profit</option>
                <option value="stop_loss">Stop Loss</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Note
              <input {...closeForm.register("note")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Opzionale" />
            </label>
            <div className="md:col-span-4 flex justify-end gap-2">
              <button
                type="submit"
                disabled={closeTrade.isPending}
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                {closeTrade.isPending ? "Chiusura in corso..." : "Chiudi trade"}
              </button>
            </div>
          </form>
          {closeTrade.error ? <div className="mt-3 text-sm text-red-300">Chiusura trade non riuscita.</div> : null}
          <div className="mt-3 text-xs text-slate-400">
            La fee di uscita viene calcolata automaticamente dal broker; il netto della chiusura viene mostrato nel riepilogo dopo la conferma.
          </div>
        </section>
      ) : null}

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold">Eseguiti</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Fee</th>
            </tr>
          </thead>
          <tbody>
            {executions.length ? (
              executions.map((execution) => (
                <tr key={execution.id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{new Date(execution.executed_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{execution.action}</td>
                  <td className="px-3 py-2">{formatMetric(execution.quantity)}</td>
                  <td className="px-3 py-2">{formatMoney(execution.price, execution.currency)}</td>
                  <td className="px-3 py-2">{formatMoney(execution.fee, execution.currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-slate-400">Nessun eseguito.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <div className="mb-3 text-lg font-semibold">Immagini Trade</div>
        {data.images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={async () => {
                  if (zoomImageUrl) {
                    URL.revokeObjectURL(zoomImageUrl);
                  }
                  const variant = image.annotated_path ? "annotated" : "original";
                  try {
                    const zoomUrl = await fetchTradeImageBlobUrl(image.id, variant);
                    setZoomImageUrl(zoomUrl);
                  } catch {
                    setZoomImageUrl(null);
                  }
                }}
                className="overflow-hidden rounded border border-slate-700 text-left"
              >
                <div className="aspect-video bg-slate-900">
                  {thumbnailUrls[image.id] ? (
                    <img
                      src={thumbnailUrls[image.id]}
                      alt={`Trade image ${image.id}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">Preview non disponibile</div>
                  )}
                </div>
                <div className="px-2 py-1 text-xs text-slate-300">
                  #{image.id} {image.annotated_path ? "(annotata)" : "(originale)"}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Nessuna immagine caricata su questo trade.</div>
        )}
      </section>

      {zoomImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="relative w-full max-w-6xl">
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(zoomImageUrl);
                setZoomImageUrl(null);
              }}
              className="absolute right-2 top-2 rounded bg-slate-800 px-3 py-2 text-sm text-white"
            >
              Chiudi
            </button>
            <img src={zoomImageUrl} alt="Zoom trade image" className="max-h-[88vh] w-full rounded object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
