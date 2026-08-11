import { useQuery } from "@tanstack/react-query";
import { AreaSeries, ColorType, LineSeries, createChart } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { DashboardAllocation, DashboardKpis, MonthlyPnlPoint, TradeStat, dashboardKpis } from "../lib/api";

function asNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | undefined, currency?: string, locale = "en-US"): string {
  const n = asNumber(value);
  const normalized = (currency || "").trim().toUpperCase();
  if (!normalized) return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (normalized === "MIX") {
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${normalized}`;
  }
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: normalized }).format(n);
  } catch {
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${normalized}`;
  }
}

function formatSignedMoney(value: string | number | undefined, currency?: string, locale = "en-US"): string {
  const n = asNumber(value);
  const sign = n < 0 ? "-" : n > 0 ? "+" : "";
  return `${sign}${formatMoney(Math.abs(n), currency, locale)}`;
}

function formatPct(value: string | number | undefined): string {
  const n = asNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pnlTone(n: number): string {
  if (n > 0) return "text-teal-300 dark:text-teal-700";
  if (n < 0) return "text-red-400 dark:text-red-600";
  return "text-slate-300 dark:text-slate-500";
}

function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, m - 1, 1));
}

/* ─── Hero KPI card ──────────────── */
function KpiCard({
  label,
  value,
  tone = "text-slate-100 dark:text-slate-800",
  caption,
  delay = 0,
}: {
  label: string;
  value: string;
  tone?: string;
  caption?: string;
  delay?: number;
}) {
  return (
    <article className="card relative overflow-hidden p-4 fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
      <div className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {caption && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{caption}</div>}
    </article>
  );
}

function Panel({
  title,
  aside,
  children,
  className = "",
  delay = 0,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section className={`card overflow-hidden fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-700/40 px-4 py-3 dark:border-slate-300/30">
          <h2 className="text-sm font-semibold text-slate-200 dark:text-slate-800">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/* ─── Equity curve (lightweight-charts) ── */
type RangeKey = "1M" | "3M" | "6M" | "1Y" | "ALL";

function EquityChartPanel({ data }: { data: DashboardKpis["portfolio_history"] }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState<RangeKey>("ALL");

  const cutoff = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const visible = useMemo(() => {
    if (!data.length) return data;
    const from = range === "ALL" ? null : cutoff({ "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range]);
    return from ? data.filter((p) => p.date >= from) : data;
  }, [data, range]);

  useEffect(() => {
    if (!ref.current || visible.length < 2) return;
    const isDark = theme === "dark";
    const chart = createChart(ref.current, {
      autoSize: true,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#94a3b8" : "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.14)" },
        horzLines: { color: isDark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.14)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: {
        vertLine: { color: isDark ? "rgba(45,212,191,0.4)" : "rgba(13,148,136,0.4)", labelBackgroundColor: "#14b8a6" },
        horzLine: { color: isDark ? "rgba(45,212,191,0.4)" : "rgba(13,148,136,0.4)", labelBackgroundColor: "#14b8a6" },
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: "#2dd4bf",
      topColor: "rgba(45,212,191,0.22)",
      bottomColor: "rgba(45,212,191,0.02)",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    area.setData(visible.map((p) => ({ time: p.date, value: p.value })));

    const hasCost = visible.some((p) => p.cost != null && p.cost > 0);
    if (hasCost) {
      const cost = chart.addSeries(LineSeries, {
        color: isDark ? "#64748b" : "#94a3b8",
        lineWidth: 1,
        lineStyle: 2 as const,
        priceLineVisible: false,
      });
      cost.setData(visible.map((p) => ({ time: p.date, value: p.cost })));
    }

    return () => {
      chart.remove();
    };
  }, [visible, theme]);

  const latest = visible[visible.length - 1];
  const returnPct = visible.length >= 2 ? ((latest.value - visible[0].value) / visible[0].value) * 100 : 0;

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "1M", label: t("dashboard.range_1m") },
    { key: "3M", label: t("dashboard.range_3m") },
    { key: "6M", label: t("dashboard.range_6m") },
    { key: "1Y", label: t("dashboard.range_1y") },
    { key: "ALL", label: t("dashboard.range_all") },
  ];

  return (
    <Panel
      title={t("dashboard.equity")}
      className="xl:col-span-2"
      aside={
        <div className="flex items-center gap-3">
          {latest && (
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold tabular-nums text-slate-200 dark:text-slate-800">
                {formatMoney(latest.value, undefined, i18n.resolvedLanguage === "it" ? "it-IT" : "en-US")}
              </div>
              <div className={`text-xs tabular-nums ${pnlTone(returnPct)}`}>{formatPct(returnPct)}</div>
            </div>
          )}
          <div className="flex rounded-lg border border-slate-600/50 p-0.5 text-xs dark:border-slate-300/60">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2 py-1 transition ${
                  range === r.key
                    ? "bg-teal-500 font-semibold text-slate-950"
                    : "text-slate-400 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {data.length < 2 ? (
        <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("dashboard.no_history")}
        </div>
      ) : (
        <div ref={ref} className="w-full px-1 pt-2" />
      )}
    </Panel>
  );
}

/* ─── Win / loss donut ───────────── */
function OutcomeDonut({ kpis }: { kpis: DashboardKpis }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";
  const { wins, losses, breakeven } = kpis;
  const total = wins + losses + breakeven;
  const winRate = total > 0 ? (wins / (wins + losses || 1)) * 100 : 0;

  const r = 52;
  const c = 2 * Math.PI * r;
  const segments = [
    { value: wins, color: "#2dd4bf", label: t("dashboard.wins") },
    { value: losses, color: "#f87171", label: t("dashboard.losses") },
    { value: breakeven, color: "#64748b", label: t("dashboard.breakeven") },
  ];
  const sum = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  const arcs = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const len = (seg.value / sum) * c;
      const arc = { ...seg, len, offset };
      offset += len;
      return arc;
    });

  const stats: { label: string; kind: "factor" | "win" | "loss"; value: number }[] = [
    { label: t("dashboard.profit_factor"), kind: "factor", value: asNumber(kpis.profit_factor) },
    { label: t("dashboard.avg_win"), kind: "win", value: asNumber(kpis.avg_win) },
    { label: t("dashboard.avg_loss"), kind: "loss", value: asNumber(kpis.avg_loss) },
  ];

  const statTone = (s: (typeof stats)[number]): string => {
    if (s.kind === "factor") return s.value >= 1 ? "#2dd4bf" : "#f87171";
    if (s.kind === "win") return "#2dd4bf";
    return "#f87171";
  };

  const statText = (s: (typeof stats)[number]): string => {
    if (s.kind === "factor") {
      return s.value > 0 && asNumber(kpis.gross_losses) === 0 ? "∞" : s.value.toFixed(2);
    }
    return formatSignedMoney(s.kind === "loss" ? -s.value : s.value, undefined, locale);
  };

  return (
    <Panel title={t("dashboard.outcomes")}>
      {total === 0 || wins + losses === 0 ? (
        <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("dashboard.no_outcomes")}
        </div>
      ) : (
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="relative mx-auto">
            <svg width="160" height="160" viewBox="0 0 120 120" role="img" aria-label={t("dashboard.outcomes")}>
              <circle cx="60" cy="60" r={r} fill="none" stroke="#94a3b8" strokeWidth="11" opacity="0.15" />
              {arcs.map((arc) => (
                <circle
                  key={arc.label}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="11"
                  strokeDasharray={`${arc.len} ${c - arc.len}`}
                  strokeDashoffset={-arc.offset}
                  transform="rotate(-90 60 60)"
                >
                  <title>{`${arc.label}: ${arc.value}`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold tabular-nums text-slate-100 dark:text-slate-800">
                {Number.isFinite(winRate) ? `${Math.round(winRate)}%` : "—"}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t("dashboard.win_rate")}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs">
            {segments.map((seg) => (
              <span key={seg.label} className="flex items-center gap-1.5 text-slate-300 dark:text-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                {seg.label} · <span className="tabular-nums">{seg.value}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-700/40 pt-3 dark:border-slate-300/30">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{s.label}</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: statTone(s) }}>
                  {statText(s)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ─── Monthly PnL bars ───────────── */
function MonthlyBars({ monthly }: { monthly: MonthlyPnlPoint[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";
  const months = monthly.slice(-12);
  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(asNumber(m.realized))));
  const total = months.reduce((s, m) => s + asNumber(m.realized), 0);
  const W = 280;
  const H = 150;
  const pad = 12;
  const zero = pad + (H - pad * 2) * (maxAbs / (maxAbs * 2));
  const scale = (H - pad * 2) / 2 / maxAbs;
  const barW = Math.min(26, (W - pad * 2) / Math.max(months.length, 1) - 8);

  return (
    <Panel
      title={t("dashboard.monthly_pnl")}
      aside={
        <span className={`text-sm font-semibold tabular-nums ${pnlTone(total)}`}>
          {formatSignedMoney(total, undefined, locale)}
        </span>
      }
    >
      {months.length === 0 ? (
        <div className="flex h-52 items-center justify-center px-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("dashboard.no_monthly")}
        </div>
      ) : (
        <div className="px-2 py-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("dashboard.monthly_pnl")}>
            <line x1={pad} y1={zero} x2={W - pad} y2={zero} stroke="#64748b" strokeOpacity="0.35" strokeWidth="1" />
            {months.map((m, i) => {
              const value = asNumber(m.realized);
              const h = Math.abs(value) * scale;
              const x = pad + i * ((W - pad * 2) / months.length) + (W - pad * 2) / months.length / 2 - barW / 2;
              const y = value >= 0 ? zero - h : zero;
              return (
                <g key={m.month}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 1.5)}
                    rx="2"
                    fill={value >= 0 ? "#2dd4bf" : "#f87171"}
                    className="transition-opacity hover:opacity-80"
                  >
                    <title>{`${monthLabel(m.month, locale)}: ${formatSignedMoney(m.realized)} (${m.count})`}</title>
                  </rect>
                  <text
                    x={x + barW / 2}
                    y={H - 3}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {monthLabel(m.month, locale)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="px-3 pb-1 text-right text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {months.length} {t("dashboard.months")}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ─── Asset allocation ───────────── */
function AllocationPanel({ allocation, classes }: { allocation: DashboardAllocation[]; classes: DashboardAllocation[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";

  return (
    <Panel title={t("dashboard.allocation")} className="xl:col-span-2">
      {allocation.length === 0 ? (
        <div className="flex h-52 items-center justify-center px-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("dashboard.no_allocation")}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {allocation.map((a, i) => (
            <div key={a.symbol} className="fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-semibold text-teal-300 dark:text-teal-800">{a.symbol}</span>
                  <span className="truncate text-xs text-slate-400 dark:text-slate-500">{a.name}</span>
                </div>
                <div className="flex shrink-0 items-baseline gap-3 tabular-nums">
                  <span className="text-slate-200 dark:text-slate-700">{formatMoney(a.market_value, undefined, locale)}</span>
                  <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500">{a.weight_pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700/40 dark:bg-slate-300/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sky-400"
                  style={{ width: `${Math.min(a.weight_pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {classes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-700/40 pt-3 dark:border-slate-300/30">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t("dashboard.by_class")}
              </span>
              {classes.map((c) => (
                <span
                  key={c.instrument_type}
                  className="rounded-full border border-slate-600/60 px-2.5 py-0.5 text-xs text-slate-300 dark:border-slate-300/60 dark:text-slate-700"
                >
                  {c.instrument_type} · {c.weight_pct.toFixed(0)}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ─── Best & worst trades ────────── */
function TopTradesTable({ trades }: { trades: TradeStat[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";

  return (
    <Panel title={t("dashboard.top_trades")}>
      {trades.length === 0 ? (
        <div className="flex h-32 items-center justify-center px-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("dashboard.no_trades")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/40 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-300/30 dark:text-slate-500">
                <th className="px-4 py-2.5">{t("dashboard.col_symbol")}</th>
                <th className="px-4 py-2.5">{t("dashboard.col_side")}</th>
                <th className="px-4 py-2.5">{t("dashboard.col_status")}</th>
                <th className="px-4 py-2.5">{t("dashboard.col_closed")}</th>
                <th className="px-4 py-2.5 text-right">{t("dashboard.col_return")}</th>
                <th className="px-4 py-2.5 text-right">{t("dashboard.col_pnl")}</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const net = asNumber(trade.net_pnl);
                return (
                  <tr
                    key={`${trade.symbol}-${i}`}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 dark:border-slate-300/20 dark:hover:bg-slate-200/40"
                  >
                    <td className="px-4 py-2.5 font-semibold text-teal-300 dark:text-teal-800">{trade.symbol}</td>
                    <td className="px-4 py-2.5 uppercase text-slate-400 dark:text-slate-500">{trade.side}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          trade.status === "close"
                            ? "bg-slate-600/40 text-slate-300 dark:bg-slate-300/60 dark:text-slate-700"
                            : "bg-teal-500/15 text-teal-300 dark:bg-teal-500/20 dark:text-teal-800"
                        }`}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400 dark:text-slate-500">{trade.closed_date ?? "—"}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${pnlTone(trade.return_pct)}`}>
                      {formatPct(trade.return_pct)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${pnlTone(net)}`}>
                      {formatSignedMoney(net, undefined, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ─── Page ───────────────────────── */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "it" ? "it-IT" : "en-US";
  const { data, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: dashboardKpis,
  });

  const currency = data?.kpi_currency;

  const heroCards = [
    {
      label: t("dashboard.cards.total_pnl"),
      value: formatSignedMoney(data?.total_pnl, currency, locale),
      tone: pnlTone(asNumber(data?.total_pnl)),
      caption: t("dashboard.caption_realized_unrealized"),
      hero: true,
    },
    {
      label: t("dashboard.cards.realized_pnl"),
      value: formatSignedMoney(data?.realized_pnl, currency, locale),
      tone: pnlTone(asNumber(data?.realized_pnl)),
      caption: t("dashboard.caption_realized"),
    },
    {
      label: t("dashboard.cards.unrealized_pnl"),
      value: formatSignedMoney(data?.unrealized_pnl, currency, locale),
      tone: pnlTone(asNumber(data?.unrealized_pnl)),
      caption: t("dashboard.caption_mtm"),
    },
    {
      label: t("dashboard.cards.win_rate"),
      value: `${Math.round(asNumber(data?.win_rate))}%`,
      tone: "text-slate-100 dark:text-slate-800",
      caption: `${data?.wins ?? 0} ${t("dashboard.wins_short")} · ${data?.losses ?? 0} ${t("dashboard.losses_short")}`,
    },
  ];

  const compactCards = [
    { label: t("dashboard.cards.trades"), value: String(data?.trade_count ?? 0) },
    { label: t("dashboard.cards.open"), value: String(data?.open_positions ?? 0) },
    {
      label: t("dashboard.cards.capital_gain_tax"),
      value: formatMoney(data?.capital_gain_tax_estimate, data?.capital_gain_currency, locale),
    },
    {
      label: t("dashboard.cards.minus_offsets"),
      value: formatMoney(data?.capital_gain_loss_offset, data?.capital_gain_currency, locale),
    },
  ];

  const lastSnapshotDate =
    data?.portfolio_history?.length
      ? data.portfolio_history[data.portfolio_history.length - 1].date
      : data?.equity_curve?.length
        ? data.equity_curve[data.equity_curve.length - 1].date
        : null;

  return (
    <div className="space-y-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("dashboard.subtitle")}</p>
        </div>
        {lastSnapshotDate && (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {t("dashboard.updated")}{" "}
            <span className="tabular-nums text-slate-300 dark:text-slate-700">{lastSnapshotDate}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroCards.map((card, i) => (
              <KpiCard key={card.label} {...card} delay={i * 60} />
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {compactCards.map((card, i) => (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone="text-slate-100 dark:text-slate-800"
                delay={120 + i * 60}
              />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <EquityChartPanel data={data?.portfolio_history ?? []} />
            <OutcomeDonut kpis={data as DashboardKpis} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <MonthlyBars monthly={data?.monthly_pnl ?? []} />
            <AllocationPanel allocation={data?.asset_allocation ?? []} classes={data?.asset_classes ?? []} />
          </section>

          <TopTradesTable trades={data?.top_trades ?? []} />
        </>
      )}
    </div>
  );
}