# Dashboard, Performance e Portfolio

Questa sezione copre le tre viste di analisi: **Dashboard**, **Performance** e **Portfolio**.

---

## Dashboard

La pagina principale offre una sintesi operativa dell'intero diario, combinando i risultati dei trade con le posizioni di portafoglio.

**Dati principali:**

- **P&L totale** (realizzato + mark-to-market), **P&L realizzato**, **P&L non realizzato** (MTM), **Win rate** (didascalia vincite · perdite)
- Schede secondarie: **Trade** totali, **Posizioni aperte**, **Stima imposta plusvalenze**, **Compensazione perdite**

**Grafici e pannelli:**

| Pannello | Contenuto |
|---|---|
| Curva patrimoniale | Valore del portafoglio nel tempo (area) con linea dei costi tratteggiata opzionale; selettore intervallo **1M / 3M / 6M / 1A / TUTTO** |
| Grafico a ciambella | Distribuzione vincite / perdite / pareggio con win rate al centro; profit factor, vincita media e perdita media |
| P&L mensile | P&L realizzato degli ultimi 12 mesi a barre, con conteggio dei trade |
| P&L giornaliero complessivo | P&L giornaliero degli ultimi 30 giorni che copre trade **e** posizioni, con totale cumulato |
| Allocazione | Valore di mercato per simbolo con barre % di peso e chip per classe di strumento |
| Top trade | Le migliori operazioni: simbolo, direzione, stato, data di chiusura, rendimento % e P&L netto |

Il timestamp `Aggiornato` riflette la data dell'ultimo snapshot di portafoglio. La valuta segue la lingua (it-IT / en-US).

---

## Performance

Analisi più approfondita dell'evoluzione del valore del portafoglio, basata sugli snapshot giornalieri.

- **KPI:** Valore del portafoglio, P&L cumulato, Miglior giorno, Peggior giorno
- **Curva patrimoniale** — valore del portafoglio dagli snapshot giornalieri (grafico ad area)
- **Barre P&L giornaliero** — ultimi 30 giorni, con la % di giorni in positivo
- **Griglia calendario mensile** — giorni colorati (verde = positivo, rosso = negativo); clicca su un giorno per aprire il pannello **Dettaglio giorno** con valore totale, P&L del giorno (+ %) e P&L cumulato

> ℹ️ I dati di Performance provengono dal **job di snapshot giornaliero** (vedi Impostazioni → Ora snapshot). Se non esistono ancora snapshot, usa il ricalcolo manuale (`POST /api/snapshots/recompute` e `/api/snapshots/portfolio/recompute`) per popolare le date passate.

---

## Portfolio

Monitora le posizioni **ETF e obbligazioni** separatamente dai trade, con valutazione mark-to-market.

- **KPI:** Valore totale, Costo totale, Rendimento totale, Rendimento %
- **Storico portafoglio** — grafico dell'evoluzione del valore
- **Tabella posizioni:** simbolo, nome, tipo strumento, quantità, costo medio, date di ingresso/uscita, durata, **prezzo corrente** (Yahoo Finance), valore di mercato, rendimento ($) e rendimento %; **modifica** ed **elimina** per riga
- **Aggiungi / Modifica posizione:** conto, strumento (asset), quantità, costo medio, date di ingresso/uscita

Le posizioni sono incluse negli snapshot di portafoglio, nella curva patrimoniale e nel P&L giornaliero complessivo della Dashboard.
