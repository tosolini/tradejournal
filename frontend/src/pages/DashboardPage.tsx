import { useQuery } from "@tanstack/react-query";
import { createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

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

function formatMoney(value: string | number | undefined, currency?: string, locale = "en-US"): string {
  const n = asNumber(value);
  const normalized = (currency || "").trim().toUpperCase();
  if (!normalized) {
    return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (normalized === "MIX") {
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${normalized}`;
  }
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: normalized }).format(n);
  } catch {
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${normalized}`;
  }
}

function ChartPanel() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 280,
      layout: {
        background: { color: isDark ? '#111827' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
        horzLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
      },
    });
    const series = chart.addAreaSeries({
      lineColor: "#2dd4bf",
      topColor: "rgba(45,212,191,0.25)",
      bottomColor: "rgba(45,212,191,0.04)",
    });
    series.setData([
      { time: "2026-05-15", value: 10000 },
      { time: "2026-05-16", value: 10080 },
      { time: "2026-05-19", value: 10040 },
      { time: "2026-05-20", value: 10220 },
      { time: "2026-05-21", value: 10340 },
      { time: "2026-05-22", value: 10310 },
    ]);

    const resize = () => chart.applyOptions({ width: ref.current?.clientWidth ?? 700 });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, []);

  return <div ref={ref} className="card w-full overflow-hidden" />;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";

  const { data } = useQuery({
    queryKey: ["kpis"],
    queryFn: () => api<any>("/api/dashboard/kpis"),
  });

  const kpiCurrency = data?.kpi_currency;

  const cards = [
    { label: t("dashboard.cards.trades"), value: data?.trade_count ?? 0 },
    { label: t("dashboard.cards.open"), value: data?.open_positions ?? 0 },
    { label: t("dashboard.cards.realized_pnl"), value: formatMoney(data?.realized_pnl ?? "0", kpiCurrency, locale) },
    { label: t("dashboard.cards.total_pnl"), value: formatMoney(data?.total_pnl ?? "0", kpiCurrency, locale) },
    { label: t("dashboard.cards.capital_gain_tax"), value: formatMoney(data?.capital_gain_tax_estimate ?? "0", data?.capital_gain_currency, locale) },
    { label: t("dashboard.cards.minus_offsets"), value: formatMoney(data?.capital_gain_loss_offset ?? "0", data?.capital_gain_currency, locale) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-400 dark:text-slate-900">{t("dashboard.subtitle")}</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="card p-4">
            <div className="text-sm text-slate-400 dark:text-slate-900">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-teal-200 dark:text-teal-900">{card.value}</div>
          </article>
        ))}
      </section>
      <ChartPanel />
    </div>
  );
}
