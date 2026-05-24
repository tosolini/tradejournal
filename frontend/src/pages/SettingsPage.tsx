import { Link, useNavigate } from "react-router-dom";

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">Data Registry</h2>
        <p className="mb-4 text-sm text-slate-400">Gestione anagrafiche usate nei form operativi.</p>
        <Link
          to="/settings/brokers"
          className="inline-flex rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          Gestisci Brokers
        </Link>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">Session</h2>
        <p className="mb-4 text-sm text-slate-400">Logout locale JWT.</p>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Logout
        </button>
      </section>
    </div>
  );
}
