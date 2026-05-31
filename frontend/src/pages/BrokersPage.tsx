import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { ApiError, Broker, Exchange, api, exchangesApi } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";

const brokerSchema = z.object({
  name: z.string().trim().min(2, "Inserisci un nome broker valido"),
  fee_mode: z.enum(["fixed", "percent"]),
  fee_value: z.coerce.number().min(0, "Inserisci un valore fee valido"),
  fee_currency: z.string().trim().min(3, "Inserisci una valuta valida").max(8, "Valuta troppo lunga"),
  capital_gain_mode: z.enum(["immediate", "year_end"]),
  capital_gain_rate: z.coerce.number().min(0, "Inserisci una aliquota valida"),
});

type BrokerPayload = z.infer<typeof brokerSchema>;

const exchangeSchema = z.object({
  name: z.string().trim().min(2, "Inserisci un nome valido"),
  mic: z.string().trim().optional(),
  suffix: z.string().trim().optional(),
  country: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(8).default("EUR"),
  timezone: z.string().trim().optional(),
  open_time: z.string().trim().optional(),
  close_time: z.string().trim().optional(),
});

type ExchangePayload = z.infer<typeof exchangeSchema>;

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
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

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function BrokersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"brokers" | "markets">("brokers");

  // Broker state
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowSuccess, setRowSuccess] = useState<string | null>(null);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [editName, setEditName] = useState("");
  const [editFeeMode, setEditFeeMode] = useState<"fixed" | "percent">("fixed");
  const [editFeeValue, setEditFeeValue] = useState(0);
  const [editFeeCurrency, setEditFeeCurrency] = useState("EUR");
  const [editCapitalGainMode, setEditCapitalGainMode] = useState<"immediate" | "year_end">("immediate");
  const [editCapitalGainRate, setEditCapitalGainRate] = useState(26);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);

  // Exchange state
  const [exchError, setExchError] = useState<string | null>(null);
  const [exchSuccess, setExchSuccess] = useState<string | null>(null);
  const [editingExchange, setEditingExchange] = useState<Exchange | null>(null);
  const [editExchName, setEditExchName] = useState("");
  const [editExchMic, setEditExchMic] = useState("");
  const [editExchSuffix, setEditExchSuffix] = useState("");
  const [editExchCountry, setEditExchCountry] = useState("");
  const [editExchCurrency, setEditExchCurrency] = useState("EUR");
  const [editExchTimezone, setEditExchTimezone] = useState("");
  const [editExchOpen, setEditExchOpen] = useState("");
  const [editExchClose, setEditExchClose] = useState("");
  const [deleteExchPendingId, setDeleteExchPendingId] = useState<number | null>(null);

  // Broker-exchange linking state
  const [addingExchangeForBroker, setAddingExchangeForBroker] = useState<number | null>(null);
  const [selectedExchToLink, setSelectedExchToLink] = useState<number | "">("");

  // Queries
  const { data: brokersData, isLoading: brokersLoading } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => api<Broker[]>("/api/brokers"),
  });

  const { data: exchangesData, isLoading: exchangesLoading } = useQuery({
    queryKey: ["exchanges"],
    queryFn: () => exchangesApi.list(),
  });

  // Broker mutations
  const createBroker = useMutation({
    mutationFn: (payload: BrokerPayload) =>
      api<Broker>("/api/brokers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      resetBroker({ name: "", fee_mode: "fixed", fee_value: 0, fee_currency: "EUR", capital_gain_mode: "immediate", capital_gain_rate: 26 });
      setRowError(null);
      setRowSuccess(t("brokers.success_added"));
    },
    onError: (err) => { setRowSuccess(null); setRowError(parseApiError(err)); },
  });

  const deleteBroker = useMutation({
    mutationFn: (id: number) => api<{ deleted: boolean }>(`/api/brokers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess(t("brokers.success_deleted"));
    },
    onError: (err) => { setRowSuccess(null); setRowError(parseApiError(err)); },
  });

  const updateBroker = useMutation({
    mutationFn: (payload: { id: number; name: string; fee_mode: "fixed" | "percent"; fee_value: number; fee_currency: string; capital_gain_mode: "immediate" | "year_end"; capital_gain_rate: number }) =>
      api<Broker>(`/api/brokers/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: payload.name, fee_mode: payload.fee_mode, fee_value: payload.fee_value, fee_currency: payload.fee_currency, capital_gain_mode: payload.capital_gain_mode, capital_gain_rate: payload.capital_gain_rate }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess(t("brokers.success_updated"));
      setEditingBroker(null);
      setEditName("");
    },
    onError: (err) => { setRowSuccess(null); setRowError(parseApiError(err)); },
  });

  // Exchange mutations
  const createExchange = useMutation({
    mutationFn: (payload: ExchangePayload) =>
      exchangesApi.create({
        name: payload.name,
        mic: payload.mic || null,
        suffix: payload.suffix || null,
        country: payload.country || null,
        currency: payload.currency || "EUR",
        timezone: payload.timezone || null,
        open_time: payload.open_time || null,
        close_time: payload.close_time || null,
        closed_on_weekends: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchanges"] });
      resetExchange({ name: "", mic: "", suffix: "", country: "", currency: "EUR", timezone: "", open_time: "", close_time: "" });
      setExchError(null);
      setExchSuccess(t("brokers.exchange_success_added"));
    },
    onError: (err) => { setExchSuccess(null); setExchError(parseApiError(err)); },
  });

  const deleteExchange = useMutation({
    mutationFn: (id: number) => exchangesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchanges"] });
      qc.invalidateQueries({ queryKey: ["brokers"] });
      setExchError(null);
      setExchSuccess(t("brokers.exchange_success_deleted"));
    },
    onError: (err) => { setExchSuccess(null); setExchError(parseApiError(err)); },
  });

  const updateExchange = useMutation({
    mutationFn: (payload: { id: number } & Partial<Omit<Exchange, "id">>) => {
      const { id, ...rest } = payload;
      return exchangesApi.update(id, rest);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchanges"] });
      qc.invalidateQueries({ queryKey: ["brokers"] });
      setExchError(null);
      setExchSuccess(t("brokers.exchange_success_updated"));
      setEditingExchange(null);
    },
    onError: (err) => { setExchSuccess(null); setExchError(parseApiError(err)); },
  });

  const linkExchange = useMutation({
    mutationFn: ({ brokerId, exchangeId }: { brokerId: number; exchangeId: number }) =>
      exchangesApi.linkToBroker(brokerId, exchangeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      setAddingExchangeForBroker(null);
      setSelectedExchToLink("");
      setRowSuccess(t("brokers.exchange_linked"));
    },
    onError: (err) => { setRowError(parseApiError(err)); },
  });

  const unlinkExchange = useMutation({
    mutationFn: ({ brokerId, exchangeId }: { brokerId: number; exchangeId: number }) =>
      exchangesApi.unlinkFromBroker(brokerId, exchangeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      setRowSuccess(t("brokers.exchange_unlinked"));
    },
    onError: (err) => { setRowError(parseApiError(err)); },
  });

  const seedDirecta = useMutation({
    mutationFn: () => exchangesApi.seedDirecta(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchanges"] });
      setExchError(null);
      setExchSuccess(t("brokers.exchange_seed_directa_success"));
    },
    onError: (err) => { setExchSuccess(null); setExchError(parseApiError(err)); },
  });

  // Forms
  const { register: registerBroker, handleSubmit: handleBrokerSubmit, reset: resetBroker, formState: { errors: brokerErrors } } = useForm<BrokerPayload>({
    resolver: zodResolver(brokerSchema),
    defaultValues: { name: "", fee_mode: "fixed", fee_value: 0, fee_currency: "EUR", capital_gain_mode: "immediate", capital_gain_rate: 26 },
  });

  const { register: registerExchange, handleSubmit: handleExchangeSubmit, reset: resetExchange, formState: { errors: exchangeErrors } } = useForm<ExchangePayload>({
    resolver: zodResolver(exchangeSchema),
    defaultValues: { name: "", mic: "", suffix: "", country: "", currency: "EUR", timezone: "", open_time: "", close_time: "" },
  });

  const parseApiError = (err: unknown): string => {
    if (err instanceof ApiError) return err.message || t("brokers.error_generic");
    if (!(err instanceof Error)) return t("brokers.error_generic");
    return err.message || t("brokers.error_generic");
  };

  const startEditing = (broker: Broker) => {
    setRowError(null); setRowSuccess(null);
    setEditingBroker(broker);
    setEditName(broker.name);
    setEditFeeMode(broker.fee_mode);
    setEditFeeValue(Number(broker.fee_value || 0));
    setEditFeeCurrency((broker.fee_currency || "EUR").toUpperCase());
    setEditCapitalGainMode(broker.capital_gain_mode === "year_end" ? "year_end" : "immediate");
    setEditCapitalGainRate(Number(broker.capital_gain_rate ?? 26));
  };

  const cancelEditing = () => {
    setEditingBroker(null); setEditName(""); setEditFeeMode("fixed"); setEditFeeValue(0);
    setEditFeeCurrency("EUR"); setEditCapitalGainMode("immediate"); setEditCapitalGainRate(26);
  };

  const saveEditing = async () => {
    if (!editingBroker) return;
    const parsed = brokerSchema.safeParse({ name: editName, fee_mode: editFeeMode, fee_value: editFeeValue, fee_currency: (editFeeCurrency || "EUR").toUpperCase(), capital_gain_mode: editCapitalGainMode || "immediate", capital_gain_rate: Number.isFinite(editCapitalGainRate) ? editCapitalGainRate : 26 });
    if (!parsed.success) { setRowError(parsed.error.issues[0]?.message ?? t("brokers.error_invalid_name")); return; }
    await updateBroker.mutateAsync({ id: editingBroker.id, name: parsed.data.name, fee_mode: parsed.data.fee_mode, fee_value: parsed.data.fee_value, fee_currency: parsed.data.fee_currency.toUpperCase(), capital_gain_mode: parsed.data.capital_gain_mode, capital_gain_rate: parsed.data.capital_gain_rate });
  };

  const startEditingExchange = (exchange: Exchange) => {
    setExchError(null); setExchSuccess(null);
    setEditingExchange(exchange);
    setEditExchName(exchange.name);
    setEditExchMic(exchange.mic || "");
    setEditExchSuffix(exchange.suffix || "");
    setEditExchCountry(exchange.country || "");
    setEditExchCurrency(exchange.currency || "EUR");
    setEditExchTimezone(exchange.timezone || "");
    setEditExchOpen(exchange.open_time || "");
    setEditExchClose(exchange.close_time || "");
  };

  const cancelEditingExchange = () => { setEditingExchange(null); };

  const saveEditingExchange = async () => {
    if (!editingExchange) return;
    if (!editExchName.trim() || editExchName.trim().length < 2) { setExchError(t("brokers.error_invalid_name")); return; }
    await updateExchange.mutateAsync({
      id: editingExchange.id,
      name: editExchName.trim(),
      mic: editExchMic.trim().toUpperCase() || null,
      suffix: editExchSuffix.trim().toUpperCase() || null,
      country: editExchCountry.trim().toUpperCase() || null,
      currency: (editExchCurrency.trim() || "EUR").toUpperCase(),
      timezone: editExchTimezone.trim() || null,
      open_time: editExchOpen.trim() || null,
      close_time: editExchClose.trim() || null,
    });
  };

  const inputCls = "rounded border border-slate-700 dark:border-slate-300 bg-slate-900 dark:bg-white px-3 py-2";
  const smallInputCls = "rounded border border-slate-700 dark:border-slate-300 bg-slate-900 dark:bg-white px-2 py-1 text-sm";

  const getAvailableExchanges = (broker: Broker) => {
    const linkedIds = new Set((broker.exchanges || []).map((e) => e.id));
    return (exchangesData || []).filter((e) => !linkedIds.has(e.id));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("brokers.page_title")}</h1>
        <p className="text-sm text-slate-400 dark:text-slate-900">{t("brokers.page_subtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("brokers")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "brokers" ? "border-b-2 border-teal-400 text-teal-300 dark:text-teal-700" : "text-slate-400 hover:text-slate-200 dark:text-slate-600 dark:hover:text-slate-900"}`}
        >
          {t("brokers.tab_brokers")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("markets")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "markets" ? "border-b-2 border-teal-400 text-teal-300 dark:text-teal-700" : "text-slate-400 hover:text-slate-200 dark:text-slate-600 dark:hover:text-slate-900"}`}
        >
          {t("brokers.tab_markets")}
        </button>
      </div>

      {activeTab === "brokers" && (
        <>
          <section className="card p-4">
            <h2 className="mb-3 text-lg font-semibold">{t("brokers.new_title")}</h2>
            <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleBrokerSubmit((values) => createBroker.mutate(values))}>
              <div className="grid gap-3 md:grid-cols-6">
                <input {...registerBroker("name")} placeholder="Nome broker" className={inputCls} />
                <select {...registerBroker("fee_mode")} className={inputCls}>
                  <option value="fixed">Fee fissa</option>
                  <option value="percent">Fee %</option>
                </select>
                <input type="number" step="0.000001" {...registerBroker("fee_value")} placeholder="Valore fee" className={inputCls} />
                <input {...registerBroker("fee_currency")} placeholder="Valuta fee (es. EUR)" className={inputCls} />
                <select {...registerBroker("capital_gain_mode")} className={inputCls}>
                  <option value="immediate">Capital gain immediato</option>
                  <option value="year_end">Capital gain a fine anno</option>
                </select>
                <input type="number" step="0.01" {...registerBroker("capital_gain_rate")} placeholder="Aliquota capital gain" className={inputCls} />
              </div>
              <button type="submit" className="rounded bg-teal-500 px-3 py-2 font-semibold text-slate-950" disabled={createBroker.isPending}>
                {createBroker.isPending ? t("brokers.saving") : t("brokers.create")}
              </button>
            </form>
            {brokerErrors.name && <p className="mt-2 text-sm text-red-400">{brokerErrors.name.message}</p>}
            {brokerErrors.fee_mode && <p className="mt-2 text-sm text-red-400">{brokerErrors.fee_mode.message}</p>}
            {brokerErrors.fee_value && <p className="mt-2 text-sm text-red-400">{brokerErrors.fee_value.message}</p>}
            {brokerErrors.fee_currency && <p className="mt-2 text-sm text-red-400">{brokerErrors.fee_currency.message}</p>}
            {brokerErrors.capital_gain_rate && <p className="mt-2 text-sm text-red-400">{brokerErrors.capital_gain_rate.message}</p>}
          </section>

          <section className="card overflow-x-auto">
            <div className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold">{t("brokers.list_title")}</div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 dark:border-slate-300 text-left text-slate-400 dark:text-slate-900">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Fee type</th>
                  <th className="px-4 py-2">Fee value</th>
                  <th className="px-4 py-2">Fee currency</th>
                  <th className="px-4 py-2">Capital gain</th>
                  <th className="px-4 py-2">Rate</th>
                  <th className="px-4 py-2">{t("brokers.markets_column")}</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokersLoading ? (
                  <tr><td colSpan={9} className="px-4 py-3 text-slate-400">{t("brokers.loading")}</td></tr>
                ) : brokersData?.length ? (
                  brokersData.map((broker) => (
                    <tr key={broker.id} className="border-b border-slate-800/80">
                      <td className="px-4 py-2">{broker.id}</td>
                      <td className="px-4 py-2 text-teal-200 dark:text-teal-900">
                        {editingBroker?.id === broker.id ? (
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full ${smallInputCls}`} />
                        ) : broker.name}
                      </td>
                      <td className="px-4 py-2">
                        {editingBroker?.id === broker.id ? (
                          <select value={editFeeMode} onChange={(e) => setEditFeeMode(e.target.value as "fixed" | "percent")} className={smallInputCls}>
                            <option value="fixed">fixed</option>
                            <option value="percent">percent</option>
                          </select>
                        ) : broker.fee_mode}
                      </td>
                      <td className="px-4 py-2">
                        {editingBroker?.id === broker.id ? (
                          <input type="number" step="0.000001" value={editFeeValue} onChange={(e) => setEditFeeValue(Number(e.target.value))} className={`w-24 ${smallInputCls}`} />
                        ) : Number(broker.fee_value || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-4 py-2">
                        {editingBroker?.id === broker.id ? (
                          <input value={editFeeCurrency} onChange={(e) => setEditFeeCurrency(e.target.value.toUpperCase())} className={`w-20 ${smallInputCls}`} placeholder="EUR" />
                        ) : (broker.fee_currency || "EUR").toUpperCase()}
                      </td>
                      <td className="px-4 py-2">
                        {editingBroker?.id === broker.id ? (
                          <select value={editCapitalGainMode} onChange={(e) => setEditCapitalGainMode(e.target.value as "immediate" | "year_end")} className={smallInputCls}>
                            <option value="immediate">immediate</option>
                            <option value="year_end">year_end</option>
                          </select>
                        ) : broker.capital_gain_mode}
                      </td>
                      <td className="px-4 py-2">
                        {editingBroker?.id === broker.id ? (
                          <input type="number" step="0.01" value={editCapitalGainRate} onChange={(e) => setEditCapitalGainRate(Number(e.target.value))} className={`w-20 ${smallInputCls}`} />
                        ) : `${Number(broker.capital_gain_rate || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      </td>
                      {/* Markets column */}
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1 items-center min-w-[120px]">
                          {(broker.exchanges || []).map((exc) => (
                            <span key={exc.id} className="inline-flex items-center gap-1 rounded-full bg-teal-900/60 px-2 py-0.5 text-xs text-teal-300">
                              {exc.name}{exc.suffix ? `.${exc.suffix}` : ""}
                              <button
                                type="button"
                                className="hover:text-red-400 transition-colors"
                                onClick={() => unlinkExchange.mutate({ brokerId: broker.id, exchangeId: exc.id })}
                                title={`Rimuovi ${exc.name}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {addingExchangeForBroker === broker.id ? (
                            <span className="inline-flex items-center gap-1">
                              <select
                                value={selectedExchToLink}
                                onChange={(e) => setSelectedExchToLink(e.target.value === "" ? "" : Number(e.target.value))}
                                className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs"
                              >
                                <option value="">— mercato —</option>
                                {getAvailableExchanges(broker).map((e) => (
                                  <option key={e.id} value={e.id}>{e.name}{e.suffix ? `.${e.suffix}` : ""}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="rounded bg-teal-600 px-1.5 py-0.5 text-xs text-white"
                                disabled={selectedExchToLink === "" || linkExchange.isPending}
                                onClick={() => {
                                  if (selectedExchToLink !== "") linkExchange.mutate({ brokerId: broker.id, exchangeId: Number(selectedExchToLink) });
                                }}
                              >
                                +
                              </button>
                              <button type="button" className="rounded bg-slate-600 px-1.5 py-0.5 text-xs text-white" onClick={() => { setAddingExchangeForBroker(null); setSelectedExchToLink(""); }}>
                                ×
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="rounded-full bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-teal-700 transition-colors"
                              onClick={() => { setAddingExchangeForBroker(broker.id); setSelectedExchToLink(""); }}
                              title="Aggiungi mercato"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {editingBroker?.id === broker.id ? (
                            <>
                              <button type="button" className="rounded bg-emerald-500 p-2 text-slate-950" onClick={saveEditing} disabled={updateBroker.isPending} title="Salva modifiche">
                                <SaveIcon />
                              </button>
                              <button type="button" className="rounded bg-slate-600 p-2 text-white" onClick={cancelEditing} title="Annulla modifica">
                                <CancelIcon />
                              </button>
                            </>
                          ) : (
                            <button type="button" className="rounded bg-sky-500 p-2 text-slate-950" onClick={() => startEditing(broker)} title="Modifica broker">
                              <EditIcon />
                            </button>
                          )}
                          <button type="button" className="rounded bg-red-500 p-2 text-white" onClick={() => { setRowError(null); setRowSuccess(null); setDeletePendingId(broker.id); }} title="Elimina broker">
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="px-4 py-3 text-slate-400">{t("brokers.empty")}</td></tr>
                )}
              </tbody>
            </table>
            {rowError && <div className="px-4 py-3 text-sm text-red-400">{rowError}</div>}
            {rowSuccess && <div className="px-4 py-3 text-sm text-emerald-300">{rowSuccess}</div>}
          </section>

          {deletePendingId !== null && (() => {
            const broker = brokersData?.find((b) => b.id === deletePendingId);
            return (
              <ConfirmModal
                message={t("brokers.confirm_delete", { id: deletePendingId, name: broker?.name ?? "" })}
                onConfirm={() => { deleteBroker.mutate(deletePendingId); setDeletePendingId(null); }}
                onCancel={() => setDeletePendingId(null)}
                isPending={deleteBroker.isPending}
              />
            );
          })()}
        </>
      )}

      {activeTab === "markets" && (
        <>
          <section className="card p-4">
            <h2 className="mb-1 text-lg font-semibold">{t("brokers.markets_title")}</h2>
            <p className="mb-3 text-sm text-slate-400">{t("brokers.markets_subtitle")}</p>
            <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleExchangeSubmit((values) => createExchange.mutate(values))}>
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
                <input {...registerExchange("name")} placeholder={t("brokers.exchange_name")} className={inputCls} />
                <input {...registerExchange("mic")} placeholder={t("brokers.exchange_mic")} className={inputCls} />
                <input {...registerExchange("suffix")} placeholder={t("brokers.exchange_suffix")} className={inputCls} />
                <input {...registerExchange("country")} placeholder={t("brokers.exchange_country")} className={inputCls} />
                <input {...registerExchange("currency")} placeholder={t("brokers.exchange_currency")} className={inputCls} />
                <input {...registerExchange("timezone")} placeholder={t("brokers.exchange_timezone")} className={inputCls} />
                <input {...registerExchange("open_time")} placeholder={t("brokers.exchange_open")} className={inputCls} />
                <input {...registerExchange("close_time")} placeholder={t("brokers.exchange_close")} className={inputCls} />
              </div>
              <button type="submit" className="rounded bg-teal-500 px-3 py-2 font-semibold text-slate-950" disabled={createExchange.isPending}>
                {createExchange.isPending ? t("brokers.saving") : t("brokers.exchange_add")}
              </button>
            </form>
            {exchangeErrors.name && <p className="mt-2 text-sm text-red-400">{exchangeErrors.name.message}</p>}
            {exchangeErrors.currency && <p className="mt-2 text-sm text-red-400">{exchangeErrors.currency.message}</p>}
          </section>

          <section className="card overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-700/80 px-4 py-3">
              <span className="text-lg font-semibold">{t("brokers.markets_title")}</span>
              <button
                type="button"
                onClick={() => seedDirecta.mutate()}
                disabled={seedDirecta.isPending}
                className="rounded bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                title={t("brokers.exchange_seed_directa_hint")}
              >
                {seedDirecta.isPending ? "…" : t("brokers.exchange_seed_directa")}
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">{t("brokers.exchange_name")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_mic")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_suffix")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_country")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_currency")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_timezone")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_open")}</th>
                  <th className="px-4 py-2">{t("brokers.exchange_close")}</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exchangesLoading ? (
                  <tr><td colSpan={10} className="px-4 py-3 text-slate-400">{t("brokers.exchange_loading")}</td></tr>
                ) : exchangesData?.length ? (
                  exchangesData.map((exc) => (
                    <tr key={exc.id} className="border-b border-slate-800/80">
                      <td className="px-4 py-2">{exc.id}</td>
                      <td className="px-4 py-2 text-teal-200 dark:text-teal-900">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchName} onChange={(e) => setEditExchName(e.target.value)} className={`w-full ${smallInputCls}`} />
                        ) : exc.name}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchMic} onChange={(e) => setEditExchMic(e.target.value)} className={`w-20 ${smallInputCls}`} />
                        ) : exc.mic || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchSuffix} onChange={(e) => setEditExchSuffix(e.target.value)} className={`w-16 ${smallInputCls}`} />
                        ) : exc.suffix || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchCountry} onChange={(e) => setEditExchCountry(e.target.value)} className={`w-16 ${smallInputCls}`} />
                        ) : exc.country || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchCurrency} onChange={(e) => setEditExchCurrency(e.target.value.toUpperCase())} className={`w-16 ${smallInputCls}`} />
                        ) : exc.currency}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchTimezone} onChange={(e) => setEditExchTimezone(e.target.value)} className={`w-32 ${smallInputCls}`} />
                        ) : exc.timezone || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchOpen} onChange={(e) => setEditExchOpen(e.target.value)} className={`w-20 ${smallInputCls}`} placeholder="HH:MM" />
                        ) : exc.open_time || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {editingExchange?.id === exc.id ? (
                          <input value={editExchClose} onChange={(e) => setEditExchClose(e.target.value)} className={`w-20 ${smallInputCls}`} placeholder="HH:MM" />
                        ) : exc.close_time || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {editingExchange?.id === exc.id ? (
                            <>
                              <button type="button" className="rounded bg-emerald-500 p-2 text-slate-950" onClick={saveEditingExchange} disabled={updateExchange.isPending} title="Salva">
                                <SaveIcon />
                              </button>
                              <button type="button" className="rounded bg-slate-600 p-2 text-white" onClick={cancelEditingExchange} title="Annulla">
                                <CancelIcon />
                              </button>
                            </>
                          ) : (
                            <button type="button" className="rounded bg-sky-500 p-2 text-slate-950" onClick={() => startEditingExchange(exc)} title="Modifica">
                              <EditIcon />
                            </button>
                          )}
                          <button type="button" className="rounded bg-red-500 p-2 text-white" onClick={() => { setExchError(null); setExchSuccess(null); setDeleteExchPendingId(exc.id); }} title="Elimina">
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={10} className="px-4 py-3 text-slate-400">{t("brokers.exchange_empty")}</td></tr>
                )}
              </tbody>
            </table>
            {exchError && <div className="px-4 py-3 text-sm text-red-400">{exchError}</div>}
            {exchSuccess && <div className="px-4 py-3 text-sm text-emerald-300">{exchSuccess}</div>}
          </section>

          {deleteExchPendingId !== null && (() => {
            const exc = exchangesData?.find((e) => e.id === deleteExchPendingId);
            return (
              <ConfirmModal
                message={t("brokers.exchange_confirm_delete", { id: deleteExchPendingId, name: exc?.name ?? "" })}
                onConfirm={() => { deleteExchange.mutate(deleteExchPendingId); setDeleteExchPendingId(null); }}
                onCancel={() => setDeleteExchPendingId(null)}
                isPending={deleteExchange.isPending}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}
