import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Broker, api } from "../lib/api";

const brokerSchema = z.object({
  name: z.string().trim().min(2, "Inserisci un nome broker valido"),
  fee_mode: z.enum(["fixed", "percent"]),
  fee_value: z.coerce.number().min(0, "Inserisci un valore fee valido"),
  fee_currency: z.string().trim().min(3, "Inserisci una valuta valida").max(8, "Valuta troppo lunga"),
  capital_gain_mode: z.enum(["immediate", "year_end"]),
  capital_gain_rate: z.coerce.number().min(0, "Inserisci una aliquota valida"),
});

type BrokerPayload = z.infer<typeof brokerSchema>;

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
  const qc = useQueryClient();
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowSuccess, setRowSuccess] = useState<string | null>(null);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [editName, setEditName] = useState("");
  const [editFeeMode, setEditFeeMode] = useState<"fixed" | "percent">("fixed");
  const [editFeeValue, setEditFeeValue] = useState(0);
  const [editFeeCurrency, setEditFeeCurrency] = useState("EUR");
  const [editCapitalGainMode, setEditCapitalGainMode] = useState<"immediate" | "year_end">("immediate");
  const [editCapitalGainRate, setEditCapitalGainRate] = useState(26);

  const { data, isLoading } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => api<Broker[]>("/api/brokers"),
  });

  const createBroker = useMutation({
    mutationFn: (payload: BrokerPayload) =>
      api<Broker>("/api/brokers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      reset({
        name: "",
        fee_mode: "fixed",
        fee_value: 0,
        fee_currency: "EUR",
        capital_gain_mode: "immediate",
        capital_gain_rate: 26,
      });
      setRowError(null);
      setRowSuccess("Broker aggiunto.");
    },
    onError: (err) => {
      setRowSuccess(null);
      setRowError(parseApiError(err));
    },
  });

  const deleteBroker = useMutation({
    mutationFn: (id: number) => api<{ deleted: boolean }>(`/api/brokers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess("Broker eliminato.");
    },
    onError: (err) => {
      setRowSuccess(null);
      setRowError(parseApiError(err));
    },
  });

  const updateBroker = useMutation({
    mutationFn: (payload: {
      id: number;
      name: string;
      fee_mode: "fixed" | "percent";
      fee_value: number;
      fee_currency: string;
      capital_gain_mode: "immediate" | "year_end";
      capital_gain_rate: number;
    }) =>
      api<Broker>(`/api/brokers/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          fee_mode: payload.fee_mode,
          fee_value: payload.fee_value,
          fee_currency: payload.fee_currency,
          capital_gain_mode: payload.capital_gain_mode,
          capital_gain_rate: payload.capital_gain_rate,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brokers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess("Broker aggiornato.");
      setEditingBroker(null);
      setEditName("");
    },
    onError: (err) => {
      setRowSuccess(null);
      setRowError(parseApiError(err));
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrokerPayload>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      name: "",
      fee_mode: "fixed",
      fee_value: 0,
      fee_currency: "EUR",
      capital_gain_mode: "immediate",
      capital_gain_rate: 26,
    },
  });

  const parseApiError = (err: unknown): string => {
    if (!(err instanceof Error)) {
      return "Operazione non riuscita";
    }
    try {
      const parsed = JSON.parse(err.message);
      return parsed?.detail ? String(parsed.detail) : err.message;
    } catch {
      return err.message || "Operazione non riuscita";
    }
  };

  const startEditing = (broker: Broker) => {
    setRowError(null);
    setRowSuccess(null);
    setEditingBroker(broker);
    setEditName(broker.name);
    setEditFeeMode(broker.fee_mode);
    setEditFeeValue(Number(broker.fee_value || 0));
    setEditFeeCurrency((broker.fee_currency || "EUR").toUpperCase());
    setEditCapitalGainMode(broker.capital_gain_mode === "year_end" ? "year_end" : "immediate");
    setEditCapitalGainRate(Number(broker.capital_gain_rate ?? 26));
  };

  const cancelEditing = () => {
    setEditingBroker(null);
    setEditName("");
    setEditFeeMode("fixed");
    setEditFeeValue(0);
    setEditFeeCurrency("EUR");
    setEditCapitalGainMode("immediate");
    setEditCapitalGainRate(26);
  };

  const saveEditing = async () => {
    if (!editingBroker) {
      return;
    }
    const parsed = brokerSchema.safeParse({
      name: editName,
      fee_mode: editFeeMode,
      fee_value: editFeeValue,
      fee_currency: (editFeeCurrency || "EUR").toUpperCase(),
      capital_gain_mode: editCapitalGainMode || "immediate",
      capital_gain_rate: Number.isFinite(editCapitalGainRate) ? editCapitalGainRate : 26,
    });
    if (!parsed.success) {
      setRowError(parsed.error.issues[0]?.message ?? "Nome broker non valido");
      return;
    }
    await updateBroker.mutateAsync({
      id: editingBroker.id,
      name: parsed.data.name,
      fee_mode: parsed.data.fee_mode,
      fee_value: parsed.data.fee_value,
      fee_currency: parsed.data.fee_currency.toUpperCase(),
      capital_gain_mode: parsed.data.capital_gain_mode,
      capital_gain_rate: parsed.data.capital_gain_rate,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings • Brokers</h1>
        <p className="text-sm text-slate-400">Gestisci l'anagrafica broker da associare agli account.</p>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-semibold">Nuovo Broker</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit((values) => createBroker.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-6">
            <input
              {...register("name")}
              placeholder="Nome broker"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            />
            <select {...register("fee_mode")} className="rounded border border-slate-700 bg-slate-900 px-3 py-2">
              <option value="fixed">Fee fissa</option>
              <option value="percent">Fee %</option>
            </select>
            <input
              type="number"
              step="0.000001"
              {...register("fee_value")}
              placeholder="Valore fee"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            />
            <input
              {...register("fee_currency")}
              placeholder="Valuta fee (es. EUR)"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            />
            <select {...register("capital_gain_mode")} className="rounded border border-slate-700 bg-slate-900 px-3 py-2">
              <option value="immediate">Capital gain immediato</option>
              <option value="year_end">Capital gain a fine anno</option>
            </select>
            <input
              type="number"
              step="0.01"
              {...register("capital_gain_rate")}
              placeholder="Aliquota capital gain"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-teal-500 px-3 py-2 font-semibold text-slate-950"
            disabled={createBroker.isPending}
          >
            {createBroker.isPending ? "Saving..." : "Aggiungi broker"}
          </button>
        </form>
        {errors.name ? <p className="mt-2 text-sm text-red-400">{errors.name.message}</p> : null}
        {errors.fee_mode ? <p className="mt-2 text-sm text-red-400">{errors.fee_mode.message}</p> : null}
        {errors.fee_value ? <p className="mt-2 text-sm text-red-400">{errors.fee_value.message}</p> : null}
        {errors.fee_currency ? <p className="mt-2 text-sm text-red-400">{errors.fee_currency.message}</p> : null}
        {errors.capital_gain_mode ? <p className="mt-2 text-sm text-red-400">{errors.capital_gain_mode.message}</p> : null}
        {errors.capital_gain_rate ? <p className="mt-2 text-sm text-red-400">{errors.capital_gain_rate.message}</p> : null}
      </section>

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold">Lista Broker</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Fee type</th>
              <th className="px-4 py-2">Fee value</th>
              <th className="px-4 py-2">Fee currency</th>
              <th className="px-4 py-2">Capital gain</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-3 text-slate-400">
                  Loading brokers...
                </td>
              </tr>
            ) : data?.length ? (
              data.map((broker) => (
                <tr key={broker.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-2">{broker.id}</td>
                  <td className="px-4 py-2 text-teal-200">
                    {editingBroker?.id === broker.id ? (
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                    ) : (
                      broker.name
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingBroker?.id === broker.id ? (
                      <select
                        value={editFeeMode}
                        onChange={(event) => setEditFeeMode(event.target.value as "fixed" | "percent")}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      >
                        <option value="fixed">fixed</option>
                        <option value="percent">percent</option>
                      </select>
                    ) : (
                      broker.fee_mode
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingBroker?.id === broker.id ? (
                      <input
                        type="number"
                        step="0.000001"
                        value={editFeeValue}
                        onChange={(event) => setEditFeeValue(Number(event.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                    ) : (
                      Number(broker.fee_value || 0).toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingBroker?.id === broker.id ? (
                      <input
                        value={editFeeCurrency}
                        onChange={(event) => setEditFeeCurrency(event.target.value.toUpperCase())}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                        placeholder="EUR"
                      />
                    ) : (
                      (broker.fee_currency || "EUR").toUpperCase()
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingBroker?.id === broker.id ? (
                      <select
                        value={editCapitalGainMode}
                        onChange={(event) => setEditCapitalGainMode(event.target.value as "immediate" | "year_end")}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      >
                        <option value="immediate">immediate</option>
                        <option value="year_end">year_end</option>
                      </select>
                    ) : (
                      broker.capital_gain_mode
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingBroker?.id === broker.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editCapitalGainRate}
                        onChange={(event) => setEditCapitalGainRate(Number(event.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                    ) : (
                      `${Number(broker.capital_gain_rate || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      {editingBroker?.id === broker.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded bg-emerald-500 p-2 text-slate-950"
                            onClick={saveEditing}
                            disabled={updateBroker.isPending}
                            title="Salva modifiche"
                            aria-label="Salva modifiche"
                          >
                            <SaveIcon />
                          </button>
                          <button
                            type="button"
                            className="rounded bg-slate-600 p-2 text-white"
                            onClick={cancelEditing}
                            title="Annulla modifica"
                            aria-label="Annulla modifica"
                          >
                            <CancelIcon />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="rounded bg-sky-500 p-2 text-slate-950"
                          onClick={() => startEditing(broker)}
                          title="Modifica broker"
                          aria-label="Modifica broker"
                        >
                          <EditIcon />
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded bg-red-500 p-2 text-white"
                        onClick={async () => {
                          setRowError(null);
                          setRowSuccess(null);
                          const confirmed = window.confirm(`Eliminare broker #${broker.id} (${broker.name})?`);
                          if (!confirmed) {
                            return;
                          }
                          await deleteBroker.mutateAsync(broker.id);
                        }}
                        title="Elimina broker"
                        aria-label="Elimina broker"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-3 text-slate-400">
                  Nessun broker presente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rowError ? <div className="px-4 py-3 text-sm text-red-400">{rowError}</div> : null}
        {rowSuccess ? <div className="px-4 py-3 text-sm text-emerald-300">{rowSuccess}</div> : null}
      </section>
    </div>
  );
}
