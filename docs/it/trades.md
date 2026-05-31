# Gestione Trade

I trade sono il cuore di TradeJournal. Ogni operazione di acquisto o vendita viene registrata come un trade con tutti i dettagli necessari per l'analisi delle performance.

## Creare un nuovo trade

Clicca su **+ Nuovo Trade** nella barra laterale. Si apre una finestra con i campi da compilare.

### Campi principali

| Campo | Descrizione |
|---|---|
| **Conto** | Il conto di trading su cui è stata eseguita l'operazione |
| **Simbolo** | Il ticker del titolo (es. `ENEL.MI`, `AAPL`). Supporta autocompletamento se i ticker sono stati importati. |
| **Direzione** | `Long` (acquisto) o `Short` (vendita allo scoperto) |
| **Quantità** | Numero di unità/lotti negoziati |
| **Prezzo di ingresso** | Prezzo a cui è stata aperta la posizione |
| **Tipo di esecuzione** | `Market`, `Limit`, `Stop`, `Stop Limit` |
| **Data e ora** | Data e orario di apertura (in formato locale) |
| **Take Profit** | Livello di prezzo obiettivo per la chiusura in profitto |
| **Stop Loss** | Livello di prezzo per limitare le perdite |
| **Note** | Annotazioni libere sull'operazione |

### Autocompletamento simbolo

Se hai importato i ticker (vedi sezione [Ticker](tickers.md)), il campo Simbolo propone suggerimenti durante la digitazione:

1. Digita almeno 1-2 caratteri
2. Appare un dropdown con i ticker corrispondenti (Simbolo + Nome + Mercato)
3. Clicca sul ticker desiderato per selezionarlo

Se il ticker non è nel database, puoi comunque digitarlo manualmente.

## Elenco trade

La sezione **Trade** mostra tutte le operazioni in una tabella ordinabile e filtrabile.

- **Filtri disponibili:** per data, conto, simbolo, direzione, stato
- **Ordinamento:** per data, P&L, percentuale di rendimento

## Dettaglio trade

Cliccando su un trade si apre la pagina di dettaglio con:

- Tutti i dati dell'operazione
- Calcolo automatico di **P&L** (profitto/perdita) e percentuale
- Sezione per allegare **immagini** (screenshot grafici, analisi)
- Note dettagliate

## Chiudere un trade

Dalla pagina di dettaglio o dalla lista, clicca **Modifica** per aggiornare il trade con:

- Prezzo di uscita
- Data di chiusura
- Motivo di chiusura (Take Profit, Stop Loss, Manuale, Scadenza)

## Importare trade da CSV

È possibile importare trade in blocco tramite file CSV. Il formato supportato è compatibile con i principali export dei broker. Vai su **Trade → Importa** per accedere alla funzione.
