# Guida introduttiva

Benvenuto in **TradeJournal**, il tuo diario di trading self-hosted per registrare operazioni, portafoglio e performance sui mercati finanziari.

## Primo accesso

Al primo accesso ti verranno richieste le credenziali. Se l'istanza è appena stata avviata, utilizza le credenziali predefinite fornite dall'amministratore (vedi sotto).

Un banner di benvenuto su **Impostazioni** ti guida nei 4 passi iniziali:

1. **Cambia le credenziali** — all'inizio l'istanza usa l'account amministratore predefinito. Imposta una tua email e una password robusta.
2. **Collega un broker** — crea il broker e i suoi mercati prima di aprire i conti.
3. **Crea un conto** — i conti rappresentano i portafogli in cui registri operazioni e movimenti di cassa.
4. **Inizia il diario** — registra la tua prima operazione con la procedura guidata **+ Nuova operazione**.

> ⚠️ **Account amministratore predefinito.** Al primo avvio il backend crea automaticamente un utente admin (`admin` / `password123`, configurabile con `SEED_ADMIN_*`). Cambia sempre queste credenziali al di fuori dello sviluppo locale. Con `ENVIRONMENT=production` il backend **rifiuta di avviarsi** con la password admin predefinita o con la `JWT_SECRET_KEY` di default.

## Configurazione iniziale consigliata

Segui questi passi prima di registrare la prima operazione.

### 1. Profilo e fuso orario

Vai su **Impostazioni → Account** e configura:

- **Fuso orario** — essenziale per il corretto funzionamento dell'orario di mercato nel calendario. Scegli la tua zona (es. `Europe/Rome` per l'Italia).
- **Email e password** — aggiorna le credenziali iniziali.

> ⚠️ Senza un fuso orario configurato, il calendario dei mercati non mostrerà correttamente gli orari.

### 2. Crea un Broker

Vai su **Broker** e crea almeno un broker con cui operi (es. Directa SIM, DEGIRO, Interactive Brokers).

Per ogni broker puoi:

- Impostare nome e sito web
- Configurare le commissioni (fisse o in percentuale) e la valuta delle commissioni
- Impostare la **modalità di tassazione plusvalenze** (`Immediata` alla chiusura o `Fine anno`) e l'aliquota (default 26%)
- Aggiungere i **mercati/borse** abilitati per quel broker — per Directa SIM è disponibile un seed automatico

### 3. Crea un Conto

Vai su **Conti** e crea un conto di trading collegato al broker appena creato. Il conto rappresenta il portafoglio reale o simulato in cui registri le operazioni.

Ogni conto ha un **libro cassa** per depositi e prelievi (vedi [Conti e Broker](accounts.md)).

### 4. Importa i Ticker

Vai su **Ticker** e importa il file CSV dei titoli negoziabili (disponibile da Euronext). Questo abilita l'**autocompletamento del simbolo** quando crei una nuova operazione (vedi [Ticker](tickers.md)).

### 5. Crea la Prima Operazione

Clicca **+ Nuova operazione** nella barra laterale e segui la procedura guidata in 6 passi (vedi [Gestione Trade](trades.md)).

---

## Struttura dell'Applicazione

| Sezione | Descrizione |
|---|---|
| Dashboard | Panoramica KPI: P&L, curva patrimoniale, allocazione, top trade |
| Calendario | Calendario mensile del diario e orari dei mercati (Gantt) |
| Trade | Tutte le operazioni registrate, esecuzioni e chiusure |
| Note | Diario giornaliero con editor rich-text, mood e tag di mercato |
| Guida | Questo manuale |
| Portfolio | Posizioni ETF & obbligazioni con mark-to-market |
| Performance | Valore del portafoglio, curva patrimoniale, P&L giornaliero |
| Assets | Anagrafica strumenti (ETF, azioni, obbligazioni, fondi) |
| Conti | Conti di trading e libro cassa |
| Broker | Broker, configurazione commissioni/tasse e mercati abilitati |
| Ticker | Database simboli per l'autocompletamento |
| Impostazioni | Profilo, utenti admin, lingua, export/import dati, ora snapshot |
