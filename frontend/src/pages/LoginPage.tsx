import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";

const schema = z.object({
  username_or_email: z.string().min(1),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      const result = await login(data.username_or_email, data.password);
      localStorage.setItem("token", result.access_token);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Invalid credentials")) {
        setError("Credenziali non valide");
        return;
      }
      setError("Errore di connessione API. Verifica backend attivo e configurazione CORS.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-md p-6">
        <h1 className="mb-2 text-2xl font-semibold text-teal-200">TradeJournal</h1>
        <p className="mb-6 text-sm text-slate-400">Accedi per aprire la tua dashboard.</p>
        <div className="space-y-4">
          <input
            {...register("username_or_email")}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
            placeholder="Username o email"
          />
          <input
            type="password"
            {...register("password")}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
            placeholder="Password"
          />
          {error ? <div className="text-sm text-red-400">{error}</div> : null}
          <button className="w-full rounded-lg bg-teal-500 px-3 py-2 font-medium text-slate-900">
            Login
          </button>
        </div>
      </form>
    </div>
  );
}
