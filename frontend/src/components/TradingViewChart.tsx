import { useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

const MIC_TO_TV: Record<string, string> = {
  XMIL: "MIL",
  XMOT: "MIL",
  XIDEM: "MIL",
  ETLX: "MIL",
  XPAR: "EURONEXT",
  XAMS: "EURONEXT",
  XBRU: "EURONEXT",
  XLIS: "EURONEXT",
  XDUB: "EURONEXT",
  XETR: "XETR",
  XEUR: "EUREX",
  XCBO: "CBOE",
  XNYS: "NYSE",
  XNAS: "NASDAQ",
  XASE: "AMEX",
  XCME: "CME",
  XSWX: "SIX",
  XLON: "LSE",
};

const NAME_TO_TV: Record<string, string> = {
  "mta euronext milan": "MIL",
  "euronext star milan": "MIL",
  "euronext growth milan": "MIL",
  "euronext miv milan": "MIL",
  "euronext milan": "MIL",
  "borsa italiana": "MIL",
  "milan": "MIL",
  "mil": "MIL",
  "euronext paris": "EURONEXT",
  "euronext amsterdam": "EURONEXT",
  "euronext brussels": "EURONEXT",
  "euronext": "EURONEXT",
  "xetra": "XETR",
  "xetr": "XETR",
  "frankfurt": "XETR",
  "eurex": "EUREX",
  "six swiss exchange": "SIX",
  "swiss exchange": "SIX",
  "nyse": "NYSE",
  "nasdaq": "NASDAQ",
  "amex": "AMEX",
  "nasdaq global select market": "NASDAQ",
  "lse": "LSE",
  "london stock exchange": "LSE",
  "cme": "CME",
};

function resolveExchangePrefix(market?: string): string | null {
  if (!market) return null;
  const upper = market.trim().toUpperCase();
  if (MIC_TO_TV[upper]) return MIC_TO_TV[upper];
  const lower = market.trim().toLowerCase();
  if (NAME_TO_TV[lower]) return NAME_TO_TV[lower];
  for (const [key, val] of Object.entries(NAME_TO_TV)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

interface TradingViewChartProps {
  symbol: string;
  market?: string;
  height?: number;
}

export function TradingViewChart({ symbol, market, height = 500 }: TradingViewChartProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const prefix = resolveExchangePrefix(market);
  const tvSymbol = prefix ? `${prefix}:${symbol}` : symbol;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = `height:${height - 32}px;width:100%`;
    container.appendChild(widgetDiv);

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">' +
      '<span style="color:#2962FF">Track all markets on TradingView</span></a>';
    container.appendChild(copyright);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: height,
      symbol: tvSymbol,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      interval: "D",
      timezone: "Etc/UTC",
      withdateranges: false,
      theme: theme,
      style: "1",
      locale: "it",
      allow_symbol_change: true,
      calendar: false,
      details: false,
      studies: ["STD;MA%Ribbon"],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, theme, height]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
}

