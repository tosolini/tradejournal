import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Exchange } from "../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → minutes since midnight */
function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert a HH:MM time that is expressed in `srcTz` to minutes-since-midnight
 * in `dstTz`, using today's date as the reference.
 * Returns a value in [0, 1440) but may momentarily exceed 1440 or go negative
 * for cross-midnight sessions — we normalise to [0, 1440) with mod.
 */
function convertTz(hhmm: string, srcTz: string, dstTz: string): number {
  const today = new Date();
  const [h, m] = hhmm.split(":").map(Number);

  // Build a Date that represents hhmm in srcTz (today)
  const srcDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  const srcDate = new Date(srcDateStr + "Z"); // treat as UTC momentarily

  // Shift by the offset difference between srcTz and UTC to get a real UTC instant
  const srcOffset = getTzOffsetMinutes(srcTz, today);
  const utcMs = srcDate.getTime() - srcOffset * 60_000;

  // Now convert to dstTz
  const dstOffset = getTzOffsetMinutes(dstTz, today);
  const dstMinutes = (utcMs / 60_000 + dstOffset) % (24 * 60);
  return (dstMinutes + 24 * 60) % (24 * 60); // normalise to [0,1440)
}

/** Get the UTC offset (in minutes) for a given IANA timezone at a given Date */
function getTzOffsetMinutes(tz: string, date: Date): number {
  try {
    // Use Intl to find the UTC offset by comparing localised hour/minute parts
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    const localMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) === 24 ? 0 : Number(parts.hour),
      Number(parts.minute),
    );
    return (localMs - date.getTime()) / 60_000;
  } catch {
    return 0;
  }
}

/** Current time in user's timezone as minutes since midnight */
function nowMinutesInTz(tz: string): number {
  const now = new Date();
  const offset = getTzOffsetMinutes(tz, now);
  const utcMs = now.getTime();
  const localMs = utcMs + offset * 60_000;
  const midnight = Math.floor(localMs / (24 * 60 * 60_000)) * 24 * 60 * 60_000;
  return (localMs - midnight) / 60_000;
}

// ── holiday / weekend helpers ─────────────────────────────────────────────

/** Fixed global holidays (month 1-indexed, day) */
const GLOBAL_HOLIDAYS: Array<[number, number]> = [
  [1, 1],   // New Year
  [8, 15],  // Ferragosto / Assumption Day
  [12, 25], // Christmas
];

/**
 * Return true if the given date (in the specified timezone) is a
 * weekend (Sat/Sun) or a known global holiday.
 */
function isHolidayOrWeekend(tz: string): boolean {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = parts.weekday; // "Sat" | "Sun" | ...
  if (weekday === "Sat" || weekday === "Sun") return true;
  const month = Number(parts.month);
  const day = Number(parts.day);
  return GLOBAL_HOLIDAYS.some(([m, d]) => m === month && d === day);
}


type MarketBar = {
  exchange: Exchange;
  /** start minutes relative to "window zero" (now), in [0, 1440) */
  startRel: number;
  /** end minutes relative to window zero, may be > 1440 for multi-day */
  endRel: number;
  isOpen: boolean;
  opensIn: number | null; // minutes until open (if upcoming within 24h)
  isTodayClosed: boolean; // weekend or global holiday
};

// ── main component ───────────────────────────────────────────────────────────

interface MarketGanttProps {
  exchanges: Exchange[];
  userTimezone: string;
}

const WINDOW_MINUTES = 24 * 60;
const FALLBACK_TZ = "Europe/Rome"; // Directa seed times are in CET/CEST

export function MarketGantt({ exchanges, userTimezone }: MarketGanttProps) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);

  // Refresh every minute so the "now" line and open status update
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowMin = useMemo(() => nowMinutesInTz(userTimezone), [userTimezone, tick]);

  const bars = useMemo<MarketBar[]>(() => {
    return exchanges
      .filter((e) => e.open_time && e.close_time)
      .map((e) => {
        const srcTz = e.timezone || FALLBACK_TZ;

        // Check if today is a holiday/weekend for this exchange
        const isTodayClosed = e.closed_on_weekends && isHolidayOrWeekend(userTimezone);

        let openMin = convertTz(e.open_time!, srcTz, userTimezone);
        let closeMin = convertTz(e.close_time!, srcTz, userTimezone);

        // Handle sessions that cross midnight: if close <= open, push close by 1440
        if (closeMin <= openMin) closeMin += WINDOW_MINUTES;

        // Relative to "now" (window origin)
        let startRel = openMin - nowMin;
        let endRel = closeMin - nowMin;

        // Bring into window: if session ended before now, shift forward by 1440
        if (endRel <= 0) {
          startRel += WINDOW_MINUTES;
          endRel += WINDOW_MINUTES;
        }

        const isOpen = !isTodayClosed && startRel <= 0 && endRel > 0;
        const opensIn = !isTodayClosed && !isOpen && startRel > 0 && startRel <= WINDOW_MINUTES ? startRel : null;

        return { exchange: e, startRel, endRel, isOpen, opensIn, isTodayClosed };
      })
      .sort((a, b) => {
        // Open markets first, then by start time
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return a.startRel - b.startRel;
      });
  }, [exchanges, nowMin, userTimezone, tick]);

  // Build hour labels: 24 labels starting from the current hour
  const hourLabels = useMemo(() => {
    const nowDate = new Date();
    const offsetMin = getTzOffsetMinutes(userTimezone, nowDate);
    const localMs = nowDate.getTime() + offsetMin * 60_000;
    const currentHour = Math.floor(localMs / (60 * 60_000)) % 24;
    return Array.from({ length: 25 }, (_, i) => (currentHour + i) % 24);
  }, [nowMin, userTimezone]);

  if (bars.length === 0) {
    return (
      <div className="rounded border border-slate-700/60 bg-slate-900/40 px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
        {t("calendar.markets_empty")}
      </div>
    );
  }

  /** Convert relative minutes → percentage of the 24-hour window */
  const pct = (rel: number) =>
    `${Math.max(0, Math.min(100, (rel / WINDOW_MINUTES) * 100)).toFixed(3)}%`;

  return (
    <div className="space-y-3">
      {/* Timezone info bar */}
      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-600">
        <span>
          {t("calendar.markets_tz_label")}:{" "}
          <span className="font-medium text-slate-200 dark:text-slate-900">{userTimezone}</span>
        </span>
        <span className="text-slate-600 dark:text-slate-400">|</span>
        <span>{t("calendar.markets_now")}:{" "}
          <span className="font-medium text-teal-400 dark:text-teal-700">
            {new Intl.DateTimeFormat("default", {
              timeZone: userTimezone,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date())}
          </span>
        </span>
        <span className="text-slate-600 dark:text-slate-400">|</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500/80" />
          {t("calendar.markets_open")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500/70" />
          {t("calendar.markets_upcoming")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-600/80" />
          {t("calendar.markets_closed")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-900/60 border border-rose-700/50" />
          {t("calendar.markets_holiday")}
        </span>
      </div>

      {/* Gantt chart */}
      <div className="overflow-x-auto rounded border border-slate-700/60 bg-slate-900/40 dark:bg-white/60 p-4">
        {/* Hour ruler */}
        <div className="mb-2 flex">
          {/* Label column spacer */}
          <div className="w-44 shrink-0" />
          {/* 24 hour ticks */}
          <div className="relative flex-1">
            <div className="flex">
              {hourLabels.slice(0, 24).map((h, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid lines + bars */}
        <div className="relative space-y-1.5">
          {/* Vertical grid lines */}
          <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
            <div className="w-44 shrink-0" />
            <div className="relative flex-1">
              {hourLabels.slice(0, 25).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-slate-700/40 dark:border-slate-300/30"
                  style={{ left: `${((i / 24) * 100).toFixed(3)}%` }}
                />
              ))}
              {/* Now line */}
              <div
                className="absolute top-0 h-full border-l-2 border-rose-500/80"
                style={{ left: "0%" }}
                title={t("calendar.markets_now")}
              />
            </div>
          </div>

          {bars.map((bar) => {
            const clampedStart = Math.max(0, bar.startRel);
            const clampedEnd = Math.min(WINDOW_MINUTES, bar.endRel);
            const visible = clampedEnd > clampedStart;

            const color = bar.isTodayClosed
              ? "bg-rose-900/50 dark:bg-rose-800/40 border border-rose-700/40"
              : bar.isOpen
              ? "bg-teal-500/75 dark:bg-teal-600/80"
              : bar.opensIn !== null && bar.opensIn <= 120
              ? "bg-sky-500/65 dark:bg-sky-600/70"
              : "bg-slate-600/60 dark:bg-slate-400/50";

            const opensInLabel =
              bar.opensIn !== null
                ? bar.opensIn < 60
                  ? `${Math.round(bar.opensIn)}min`
                  : `${(bar.opensIn / 60).toFixed(1).replace(".0", "")}h`
                : null;

            return (
              <div key={bar.exchange.id} className="flex items-center gap-0">
                {/* Exchange label */}
                <div className="w-44 shrink-0 pr-3 text-right">
                  <span className="truncate text-xs font-medium text-slate-200 dark:text-slate-900" title={bar.exchange.name}>
                    {bar.exchange.name}
                  </span>
                  {bar.exchange.suffix && (
                    <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">
                      .{bar.exchange.suffix}
                    </span>
                  )}
                </div>

                {/* Bar track */}
                <div className="relative h-7 flex-1 rounded-sm bg-slate-800/40 dark:bg-slate-200/40">
                  {bar.isTodayClosed ? (
                    // Full-width holiday/weekend bar
                    <div className={`absolute inset-y-0.5 left-0 right-0 rounded ${color} flex items-center`}>
                      <span className="px-2 text-[10px] font-medium text-rose-300/80 dark:text-rose-700/80">
                        {t("calendar.markets_holiday")}
                      </span>
                    </div>
                  ) : (
                    <>
                      {visible && (
                        <div
                          className={`absolute top-0.5 h-6 rounded ${color} flex items-center overflow-hidden transition-all`}
                          style={{
                            left: pct(clampedStart),
                            width: pct(clampedEnd - clampedStart),
                          }}
                          title={`${bar.exchange.open_time} – ${bar.exchange.close_time} (${bar.exchange.timezone || FALLBACK_TZ})`}
                        >
                          <span className="px-1.5 text-[10px] font-semibold text-white/90 truncate">
                            {bar.isOpen
                              ? t("calendar.markets_open")
                              : opensInLabel
                              ? `+${opensInLabel}`
                              : null}
                          </span>
                        </div>
                      )}
                      {/* If market continues beyond the 24h window, show an arrow hint */}
                      {bar.endRel > WINDOW_MINUTES && (
                        <div className="absolute right-0 top-0 flex h-7 items-center pr-1 text-[10px] text-slate-400">→</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
