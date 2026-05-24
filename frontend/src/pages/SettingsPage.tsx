import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.resolvedLanguage === "it" ? "it" : "en";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.language.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.language.description")}</p>
        <label className="text-sm text-slate-200" htmlFor="language-switch">
          {t("settings.language.label")}
        </label>
        <select
          id="language-switch"
          className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 md:w-auto"
          value={currentLanguage}
          onChange={(event) => {
            void i18n.changeLanguage(event.target.value);
          }}
        >
          <option value="en">{t("settings.language.en")}</option>
          <option value="it">{t("settings.language.it")}</option>
        </select>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.registry.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.registry.description")}</p>
        <Link
          to="/settings/brokers"
          className="inline-flex rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {t("settings.registry.brokers_button")}
        </Link>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.session.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.session.description")}</p>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white"
        >
          {t("settings.session.logout")}
        </button>
      </section>
    </div>
  );
}
