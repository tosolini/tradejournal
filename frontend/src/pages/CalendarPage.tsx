import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type CalendarExecution = {
  id: number;
  trade_id: number;
  symbol: string;
  action: string;
  executed_at: string;
  quantity: number;
  price: number;
  fee: number;
  currency: string;
};

type CalendarNote = {
  id: number;
  mood?: string | null;
  summary?: string | null;
  text?: string | null;
  market_condition?: string | null;
};

type CalendarDayData = {
  date: string;
  notes: CalendarNote[];
  executions: CalendarExecution[];
};

type CalendarMonthResponse = {
  year: number;
  month: number;
  days: CalendarDayData[];
};

function toMonthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function parseTags(raw?: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const isItalian = i18n.resolvedLanguage === "it";
  const locale = isItalian ? "it-IT" : "en-US";
  const weekDays = isItalian
    ? ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth() + 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ["calendar-month", year, month],
    queryFn: () => api<CalendarMonthResponse>(`/api/market-calendar/journal-month?year=${year}&month=${month}`),
  });

  const byDate = useMemo(() => {
    const index = new Map<string, CalendarDayData>();
    for (const day of data?.days || []) {
      index.set(day.date, day);
    }
    return index;
  }, [data]);

  const monthGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingEmpty = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ isoDate: string | null; dayNumber: number | null }> = [];
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ isoDate: null, dayNumber: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = new Date(year, month - 1, day).toISOString().slice(0, 10);
      cells.push({ isoDate, dayNumber: day });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ isoDate: null, dayNumber: null });
    }
    return cells;
  }, [month, year]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("calendar.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
          >
            ← {t("calendar.prev_month")}
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
          >
            {t("calendar.today")}
          </button>
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
          >
            {t("calendar.next_month")} →
          </button>
        </div>
      </div>

      <div className="text-sm text-slate-400">{toMonthLabel(monthCursor, locale)}</div>

      {isLoading ? <div className="text-sm text-slate-400">{t("calendar.loading")}</div> : null}
      {error ? <div className="text-sm text-red-400">{t("calendar.unavailable")}</div> : null}

      {!isLoading && !error ? (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((weekday) => (
              <div key={weekday} className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 text-center text-xs uppercase tracking-wide text-slate-400">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            {monthGrid.map((cell, index) => {
              if (!cell.isoDate || !cell.dayNumber) {
                return <div key={`empty-${index}`} className="min-h-28 rounded border border-slate-800/60 bg-slate-900/20" />;
              }
              const dayData = byDate.get(cell.isoDate);
              const executions = dayData?.executions || [];
              const notes = dayData?.notes || [];

              return (
                <div key={cell.isoDate} className="min-h-28 rounded border border-slate-700/70 bg-slate-900/40 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-200">{cell.dayNumber}</div>
                    {(notes.length > 0 || executions.length > 0) ? (
                      <Link
                        to={`/notes?date=${cell.isoDate}`}
                        className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
                      >
                        {t("calendar.open_notes")}
                      </Link>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {executions.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("calendar.latest_executions")}</div>
                        <div className="flex flex-wrap gap-1">
                          {executions.slice(0, 3).map((execution) => (
                            <Link
                              key={execution.id}
                              to={`/trades/${execution.trade_id}`}
                              className="rounded-full border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 text-[10px] text-teal-200"
                              title={`${execution.symbol} ${execution.action} ${execution.quantity} @ ${execution.price}`}
                            >
                              {execution.symbol} {execution.action}
                            </Link>
                          ))}
                          {executions.length > 3 ? (
                            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-400">+{executions.length - 3}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {notes.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("calendar.notes")}</div>
                        <div className="space-y-1">
                          {notes.slice(0, 2).map((note) => (
                            <Link
                              key={note.id}
                              to={`/notes?date=${cell.isoDate}&noteId=${note.id}`}
                              className="block rounded border border-slate-700/70 bg-slate-900/70 px-2 py-1 transition hover:border-teal-500/50"
                            >
                              <div className="truncate text-[11px] text-slate-200">{note.summary || t("calendar.note_fallback")}</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {parseTags(note.market_condition).map((tag) => (
                                  <span key={`${note.id}-${tag}`} className="rounded-full border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </Link>
                          ))}
                          {notes.length > 2 ? (
                            <div className="text-[10px] text-slate-500">+{notes.length - 2} {t("calendar.more_notes")}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
