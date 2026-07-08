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

export function resolveExchangePrefix(market?: string): string | null {
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

export function resolveTvSymbol(symbol: string, market?: string): string {
  const prefix = resolveExchangePrefix(market);
  return prefix ? `${prefix}:${symbol}` : symbol;
}
