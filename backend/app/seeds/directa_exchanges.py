"""
Pre-seed data for Directa SIM markets.
Source: https://www.directa.it/mercati
Orari in ora italiana (CET/CEST). Formato HH:MM.
"""

# Ogni entry rappresenta un mercato/segmento negoziabile su Directa.
# open_time / close_time si riferiscono all'inizio negoziazione continua e alla chiusura
# (escludendo pre-apertura e after-hours per semplicità).
DIRECTA_EXCHANGES = [
    # ─────────────────────────────────────────────────────────────
    # ITALIA – Borsa Italiana / Euronext Milan
    # ─────────────────────────────────────────────────────────────
    {
        "name": "MTA Euronext Milan",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:01",
        "close_time": "17:30",
        # Pre-apertura 07:30–09:00, Serale 18:00–20:30
        # note: FTSE MIB e altri segmenti principali
    },
    {
        "name": "Euronext STAR Milan",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:01",
        "close_time": "17:30",
    },
    {
        "name": "Euronext Growth Milan (EGM)",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:01",
        "close_time": "17:30",
    },
    {
        "name": "SEDEX",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:05",
        "close_time": "17:30",
        # Orari variabili per strumento (09:05–17:30 / 08:00–20:30 / 08:00–22:00)
    },
    {
        "name": "Cert-X (Certificates)",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:05",
        "close_time": "17:30",
    },
    {
        "name": "ETF Plus",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:04",
        "close_time": "17:30",
    },
    {
        "name": "Euronext MIV Milan",
        "mic": "XMIL",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:01",
        "close_time": "17:30",
        # Fondi chiusi, Investment Companies, Real Investment Companies
    },
    {
        "name": "MOT (Mercato Obbligazioni Telematico)",
        "mic": "XMOT",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:01",
        "close_time": "17:30",
    },
    {
        "name": "IDEM (Futures FTSE MIB)",
        "mic": "XIDEM",
        "suffix": "MI",
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "08:01",
        "close_time": "22:00",
        # Pre-apertura 07:30–08:00
    },
    # ─────────────────────────────────────────────────────────────
    # EUROPA
    # ─────────────────────────────────────────────────────────────
    {
        "name": "Euronext Paris",
        "mic": "XPAR",
        "suffix": "PA",
        "country": "FR",
        "currency": "EUR",
        "timezone": "Europe/Paris",
        "open_time": "09:04",
        "close_time": "17:30",
        # ETF: pre-apertura 07:30–09:03
    },
    {
        "name": "Euronext Amsterdam",
        "mic": "XAMS",
        "suffix": "AS",
        "country": "NL",
        "currency": "EUR",
        "timezone": "Europe/Amsterdam",
        "open_time": "09:04",
        "close_time": "17:30",
    },
    {
        "name": "EuroTLX",
        "mic": "ETLX",
        "suffix": None,
        "country": "IT",
        "currency": "EUR",
        "timezone": "Europe/Rome",
        "open_time": "09:00",
        "close_time": "17:30",
        # Obbligazioni italiane ed estere
    },
    {
        "name": "EUREX",
        "mic": "XEUR",
        "suffix": None,
        "country": "DE",
        "currency": "EUR",
        "timezone": "Europe/Berlin",
        "open_time": "01:15",
        "close_time": "22:03",
        # Futures indici/settoriali, Bund, BTP, OAT ecc.
        # Futures BTP long/short: 08:00–19:03
    },
    {
        "name": "XETRA",
        "mic": "XETR",
        "suffix": "DE",
        "country": "DE",
        "currency": "EUR",
        "timezone": "Europe/Berlin",
        "open_time": "09:00",
        "close_time": "17:30",
        # Pre-apertura 07:30–08:55; asta intraday ~13:00–13:02
        # Trade at close 17:30–17:35
    },
    {
        "name": "Cboe Europe (ex BATS)",
        "mic": "XCBO",
        "suffix": None,
        "country": "GB",
        "currency": "EUR",
        "timezone": "Europe/London",
        "open_time": "09:00",
        "close_time": "17:30",
        # Blue chips europee
    },
    {
        "name": "LMAX Forex",
        "mic": None,
        "suffix": None,
        "country": "GB",
        "currency": "USD",
        "timezone": "UTC",
        "open_time": "23:05",
        "close_time": "23:00",
        "closed_on_weekends": False,
        # Domenica sera – venerdì sera; chiusura tecnica 23:00–23:05 ogni giorno
    },
    {
        "name": "LMAX Criptovalute",
        "mic": None,
        "suffix": None,
        "country": "GB",
        "currency": "USD",
        "timezone": "UTC",
        "open_time": "00:00",
        "close_time": "23:00",
        "closed_on_weekends": False,
        # 7 giorni su 7; chiusura settimanale sabato 11:00–18:00
    },
    {
        "name": "LMAX CFD su Indici",
        "mic": None,
        "suffix": None,
        "country": "GB",
        "currency": "USD",
        "timezone": "UTC",
        "open_time": "00:00",
        "close_time": "23:00",
        "closed_on_weekends": False,
    },
    {
        "name": "LMAX Commodities",
        "mic": None,
        "suffix": None,
        "country": "GB",
        "currency": "USD",
        "timezone": "UTC",
        "open_time": "00:01",
        "close_time": "23:00",
        "closed_on_weekends": False,
    },
    {
        "name": "SIX Swiss Exchange",
        "mic": "XSWX",
        "suffix": "SW",
        "country": "CH",
        "currency": "CHF",
        "timezone": "Europe/Zurich",
        "open_time": "09:00",
        "close_time": "17:30",
    },
    # ─────────────────────────────────────────────────────────────
    # USA
    # ─────────────────────────────────────────────────────────────
    {
        "name": "NYSE",
        "mic": "XNYS",
        "suffix": None,
        "country": "US",
        "currency": "USD",
        "timezone": "America/New_York",
        "open_time": "15:30",   # ora italiana (CET): 09:30 ET → 15:30 CET
        "close_time": "22:00",  # 16:00 ET → 22:00 CET
        # Pre-market 13:00–15:30 (CET); Post-market 22:00–23:00 (CET)
    },
    {
        "name": "NASDAQ",
        "mic": "XNAS",
        "suffix": None,
        "country": "US",
        "currency": "USD",
        "timezone": "America/New_York",
        "open_time": "15:30",
        "close_time": "22:00",
        # Pre-market 13:00–15:30 (CET); Post-market 22:00–23:00 (CET)
    },
    {
        "name": "AMEX (NYSE American)",
        "mic": "XASE",
        "suffix": None,
        "country": "US",
        "currency": "USD",
        "timezone": "America/New_York",
        "open_time": "15:30",
        "close_time": "22:00",
    },
    {
        "name": "OTC Markets",
        "mic": None,
        "suffix": None,
        "country": "US",
        "currency": "USD",
        "timezone": "America/New_York",
        "open_time": "15:30",
        "close_time": "22:00",
        # Pre-market limitato: 14:45–15:30 (CET)
    },
    {
        "name": "CME (Chicago Mercantile Exchange)",
        "mic": "XCME",
        "suffix": None,
        "country": "US",
        "currency": "USD",
        "timezone": "America/Chicago",
        "open_time": "00:00",
        "close_time": "23:00",
        "closed_on_weekends": False,
        # CME-FX: 23:45–23:59 + 00:00–23:00
        # CME-CBOT: 23:45–02:00 + 02:00–14:45 + 15:30–20:20
    },
]
