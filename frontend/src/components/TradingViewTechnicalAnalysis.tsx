import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { resolveTvSymbol } from "../lib/tv-exchange";

interface TradingViewTechnicalAnalysisProps {
  symbol: string;
  market?: string;
  height?: number;
  interval?: string;
  showIntervalTabs?: boolean;
}

export function TradingViewTechnicalAnalysis({
  symbol,
  market,
  height = 500,
  interval = "1h",
  showIntervalTabs = true,
}: TradingViewTechnicalAnalysisProps) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const tvSymbol = resolveTvSymbol(symbol, market);
  const locale = i18n.language?.slice(0, 2) || "en";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">' +
      '<span style="color:#2962FF">Technical analysis by TradingView</span></a>';
    container.appendChild(copyright);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval,
      width: "100%",
      isTransparent: false,
      height: height,
      symbol: tvSymbol,
      showIntervalTabs,
      displayMode: "multiple",
      locale,
      colorTheme: theme,
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, theme, locale, interval, showIntervalTabs, height]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ width: "100%" }}
    />
  );
}
