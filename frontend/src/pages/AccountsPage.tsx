import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Account, Broker, api } from "../lib/api";

function formatMoney(value: string | number | undefined, currency?: string): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "-";
  }
  const normalized = (currency || "").trim().toUpperCase();
  if (!normalized) {
    return amount.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: normalized }).format(amount);
  } catch {
    return `${amount.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${normalized}`;
  }
}

const accountSchema = z.object({
  name: z.string().min(2, "Inserisci un nome account valido"),
  base_currency: z.string().min(3).max(8),
  cash_balance: z.coerce.number().min(0),
  broker_id: z.number().int().positive().nullable().optional(),
});

type AccountPayload = z.infer<typeof accountSchema>;

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

export function AccountsPage() {
  const qc = useQueryClient();
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowSuccess, setRowSuccess] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [editCash, setEditCash] = useState("0");
  const [editBrokerId, setEditBrokerId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<Account[]>("/api/accounts"),
  });

  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => api<Broker[]>("/api/brokers"),
  });

  const createAccount = useMutation({
    mutationFn: (payload: AccountPayload) =>
      api<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          broker_id: payload.broker_id ?? null,
          cash_balance: payload.cash_balance.toString(),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      reset({ name: "", base_currency: "EUR", cash_balance: 0, broker_id: null });
    },
  });

  const updateAccount = useMutation({
    mutationFn: (payload: { id: number; values: AccountPayload }) =>
      api<Account>(`/api/accounts/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.values.name,
          broker_id: payload.values.broker_id ?? null,
          base_currency: payload.values.base_currency,
          cash_balance: payload.values.cash_balance.toString(),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess("Account aggiornato.");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) => api<{ deleted: boolean }>(`/api/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRowError(null);
      setRowSuccess("Account eliminato.");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountPayload>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      base_currency: "EUR",
      cash_balance: 0,
      broker_id: null,
    },
  });

  const onSubmit = async (values: AccountPayload) => {
    await createAccount.mutateAsync(values);
  };

  const startEditing = (account: Account) => {
    setRowError(null);
    setRowSuccess(null);
    setEditingAccount(account);
    setEditName(account.name);
    setEditCurrency(account.base_currency);
    setEditCash(String(account.cash_balance));
    setEditBrokerId(account.broker_id ? String(account.broker_id) : "");
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setEditName("");
    setEditCurrency("EUR");
    setEditCash("0");
    setEditBrokerId("");
  };

  const saveEditing = async () => {
    if (!editingAccount) {
      return;
    }
    const cashBalance = Number(editCash);
    if (Number.isNaN(cashBalance) || cashBalance < 0) {
      setRowError("Capitale non valido");
      return;
    }

    const values: AccountPayload = {
      name: editName,
      base_currency: editCurrency,
      cash_balance: cashBalance,
      broker_id: editBrokerId ? Number(editBrokerId) : null,
    };
    const parsed = accountSchema.safeParse(values);
    if (!parsed.success) {
      setRowError(parsed.error.issues[0]?.message ?? "Dati account non validi");
      return;
    }

    try {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        values,
      });
      cancelEditing();
    } catch (err) {
      setRowError(parseApiError(err));
    }
  };

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Accounts & Portfolios</h1>
        <p className="text-sm text-slate-400">Crea e gestisci i portafogli da usare nei trade.</p>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-semibold">New Portfolio</h2>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register("name")}
            placeholder="Portfolio name"
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <select
            {...register("broker_id", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined) {
                  return null;
                }
                const parsed = Number(value);
                return Number.isNaN(parsed) ? null : parsed;
              },
            })}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          >
            <option value="">Broker (opzionale)</option>
            {brokers?.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name}
              </option>
            ))}
          </select>
          <input
            {...register("base_currency")}
            placeholder="Currency (EUR)"
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <input
            type="number"
            step="0.01"
            {...register("cash_balance")}
            placeholder="Initial cash"
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-teal-500 px-3 py-2 font-semibold text-slate-950"
            disabled={createAccount.isPending}
          >
            {createAccount.isPending ? "Saving..." : "Create Account"}
          </button>
        </form>
        {errors.name ? <p className="mt-2 text-sm text-red-400">{errors.name.message}</p> : null}
        {createAccount.error ? (
          <p className="mt-2 text-sm text-red-400">Errore creazione account.</p>
        ) : null}
      </section>

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold">Portfolio List</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Broker</th>
              <th className="px-4 py-2">Base Currency</th>
              <th className="px-4 py-2">Cash Balance</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-slate-400">
                  Loading accounts...
                </td>
              </tr>
            ) : data?.length ? (
              data.map((account) => (
                <tr key={account.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-2">{account.id}</td>
                  {editingAccount?.id === account.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editBrokerId}
                          onChange={(event) => setEditBrokerId(event.target.value)}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                        >
                          <option value="">Nessun broker</option>
                          {brokers?.map((broker) => (
                            <option key={broker.id} value={broker.id}>
                              {broker.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editCurrency}
                          onChange={(event) => setEditCurrency(event.target.value.toUpperCase())}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editCash}
                          onChange={(event) => setEditCash(event.target.value)}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium text-teal-200">{account.name}</td>
                      <td className="px-4 py-2">{account.broker_name ?? "-"}</td>
                      <td className="px-4 py-2">{account.base_currency}</td>
                      <td className="px-4 py-2">{formatMoney(account.cash_balance, account.base_currency)}</td>
                    </>
                  )}
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      {editingAccount?.id === account.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded bg-emerald-500 p-2 text-slate-950"
                            onClick={saveEditing}
                            disabled={updateAccount.isPending}
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
                          onClick={() => startEditing(account)}
                          title="Modifica account"
                          aria-label="Modifica account"
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
                          const confirmed = window.confirm(
                            `Eliminare account #${account.id} (${account.name})?`
                          );
                          if (!confirmed) {
                            return;
                          }
                          try {
                            await deleteAccount.mutateAsync(account.id);
                          } catch (err) {
                            setRowError(parseApiError(err));
                          }
                        }}
                        title="Elimina account"
                        aria-label="Elimina account"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-slate-400">
                  Nessun account presente.
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
