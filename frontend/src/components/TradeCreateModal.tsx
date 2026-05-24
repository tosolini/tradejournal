import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Account, Broker, Trade, api } from "../lib/api";

const tradeModalSchema = z.object({
  account_id: z.coerce.number().int().positive("Seleziona un account valido."),
  symbol: z.string().trim().min(1, "Inserisci il simbolo."),
  quantity: z.coerce.number().positive("La quantita deve essere maggiore di 0."),
  direction: z.enum(["long", "short"]),
  execution_type: z.enum(["open", "close", "partial"]),
  entry_price: z.coerce.number().positive("Il prezzo ingresso deve essere maggiore di 0."),
  take_profit: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().positive("Take Profit deve essere maggiore di 0.").optional()
  ),
  stop_loss: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().positive("Stop Loss deve essere maggiore di 0.").optional()
  ),
});

type TradeModalPayload = z.infer<typeof tradeModalSchema>;

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

function FieldHelp({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex">
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] font-semibold text-slate-300 outline-none ring-teal-400/70 transition focus:ring-2"
        aria-label={text}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs leading-snug text-slate-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function TradeCreateModal({ open, onClose }: Props) {
  const qc = useQueryClient();
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
      onClose();
    },
  });

  const entryPrice = watch("entry_price");
  const takeProfit = watch("take_profit");
  const stopLoss = watch("stop_loss");
  const direction = watch("direction");
  const accountId = watch("account_id");
  const quantity = watch("quantity");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">New Trade</h2>
            <p className="text-sm text-slate-400">Crea trade + prima execution in un unico passaggio.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
          >
            Chiudi
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit((values) => createTrade.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Account
                <FieldHelp text="Seleziona il conto su cui registrare trade ed esecuzione." />
              </span>
              <select
                {...register("account_id", { valueAsNumber: true })}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value={0}>Seleziona account</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {errors.account_id ? <span className="mt-1 block text-xs text-red-300">{errors.account_id.message}</span> : null}
            </label>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Simbolo
                <FieldHelp text="Ticker strumento, ad esempio AAPL o ENEL." />
              </span>
              <input
                {...register("symbol")}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="AAPL"
              />
              {errors.symbol ? <span className="mt-1 block text-xs text-red-300">{errors.symbol.message}</span> : null}
            </label>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Quantita
                <FieldHelp text="Numero di pezzi/lotti eseguiti in questa operazione." />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("quantity")}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              />
              {errors.quantity ? <span className="mt-1 block text-xs text-red-300">{errors.quantity.message}</span> : null}
            </label>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Direzione
                <FieldHelp text="Long: guadagni se sale. Short: guadagni se scende." />
              </span>
              <select {...register("direction")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2">
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Eseguito
                <FieldHelp text="Open apre posizione, Partial chiude parzialmente, Close chiude totalmente." />
              </span>
              <select {...register("execution_type")} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2">
                <option value="open">Open</option>
                <option value="partial">Partial</option>
                <option value="close">Close</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Prezzo ingresso
                <FieldHelp text="Prezzo unitario di esecuzione per questa operazione." />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("entry_price")}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              />
              {errors.entry_price ? <span className="mt-1 block text-xs text-red-300">{errors.entry_price.message}</span> : null}
            </label>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Fee automatica
                <FieldHelp text="Calcolata dal broker in base alla sua regola (fissa o percentuale)." />
              </span>
              <div className="mt-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                {estimatedFee === null
                  ? "-"
                  : `${estimatedFee.value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${estimatedFee.currency}`}
              </div>
              <span className="mt-1 block text-xs text-slate-400">Valore stimato: il valore finale viene calcolato lato backend.</span>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Take Profit
                <FieldHelp text="Lascia vuoto se non vuoi impostarlo ora." />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("take_profit")}
                className="mt-1 w-full rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-emerald-200"
              />
              {errors.take_profit ? <span className="mt-1 block text-xs text-red-300">{errors.take_profit.message}</span> : null}
            </label>
            <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              TP %: {tpPct === null ? "-" : `${tpPct.toFixed(2)}%`}
            </div>
            <label className="text-sm text-slate-300">
              <span className="inline-flex items-center">
                Stop Loss
                <FieldHelp text="Lascia vuoto se non vuoi impostarlo ora." />
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("stop_loss")}
                className="mt-1 w-full rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-red-200"
              />
              {errors.stop_loss ? <span className="mt-1 block text-xs text-red-300">{errors.stop_loss.message}</span> : null}
            </label>
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              SL %: {slPct === null ? "-" : `${slPct.toFixed(2)}%`}
            </div>
          </div>

          {Object.keys(errors).length > 0 ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Correggi i campi evidenziati prima di salvare.
            </div>
          ) : null}

          {createTrade.error ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Creazione trade non riuscita.
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createTrade.isPending}
              className="rounded bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {createTrade.isPending ? "Saving..." : "Salva Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
