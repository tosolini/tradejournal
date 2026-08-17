# Gestione Trade

Le operazioni (trade) sono il cuore di TradeJournal. Ogni acquisto o vendita viene registrato come un trade con tutti i dettagli necessari all'analisi delle performance. Commissioni e tassazione delle plusvalenze sono configurate per broker e applicate automaticamente a ogni calcolo.

## Creare una Nuova Operazione

Clicca **+ Nuova operazione** nella barra laterale. La finestra offre due modalità:

- **Procedura guidata (Wizard)** — predefinita, in 6 passi
- **Veloce (Quick Trade)** — un unico modulo compatto con i campi essenziali

### La Procedura Guidata in 6 Passi

| Passo | Cosa imposti |
|---|---|
| 1. **Conto & Ticker** | Il conto di trading e il simbolo (con autocompletamento) |
| 2. **Entry & Quantità** | Quantità — in **quote** o per **controvalore** (€) — più la commissione stimata |
| 3. **Direzione** | **Long** o **Short** |
| 4. **Take Profit** | Obiettivo — come **prezzo** o **%** dalla entry, con slider |
| 5. **Stop Loss** | Limite — come **prezzo** o **%** dalla entry, con slider |
| 6. **Esecuzione** | Tipo di esecuzione (`Apertura`, `Parziale`, `Chiusura`) e riepilogo completo prima del salvataggio |

Ogni passo viene validato prima di proseguire; un indicatore mostra l'avanzamento. La procedura si azzera alla riapertura.

### Autocompletamento del Simbolo

Se hai importato i ticker (vedi [Ticker](tickers.md)), il campo simbolo mostra suggerimenti in tempo reale con simbolo, nome, ISIN e mercato. Se il ticker non è nel database, puoi sempre digitarlo manualmente.

## Elenco Trade

La sezione **Trade** mostra tutte le operazioni in una tabella ordinabile e filtrabile.

- **Esecuzioni recenti** in alto (ultime 12, ricercabili), con collegamento al trade relativo
- **Tabella trade:** ordinamento su qualsiasi colonna; **filtro stato** (Tutti / Aperti / Parziali / Chiusi) e ricerca testuale
- **12 colonne opzionali** (Entry media, Exit media, Totale entry, Totale exit, Q.tà aperta, Durata, Rendimento, Rend. %, TP %, SL %, TP ass., SL ass.) — la visibilità delle colonne viene salvata
- **Azioni di riga:** Visualizza, Modifica, Gestisci immagini, Chiusura rapida, Elimina

### Chiusura Rapida

Dalla riga dell'elenco, apri il pannello **Chiusura rapida**: imposta il prezzo di uscita (pre-compilato con il TP o la entry media), scegli il motivo (`Manuale`, `Take profit`, `Stop loss`), aggiungi eventualmente una nota e chiudi. P&L e stima dell'imposta sulle plusvalenze vengono calcolati automaticamente.

## Dettaglio Trade

Cliccando su un trade si apre la pagina di dettaglio con le schede:

- **Panoramica** — simbolo, direzione, stato, TP/SL (prezzo, %, assoluto e netto di commissioni/tasse), rendimento
- **Grafico** — grafico TradingView per il simbolo
- **Tecnico** — widget di analisi tecnica TradingView
- **Chiusura** — modulo di chiusura (data/ora, prezzo, motivo, nota) per i trade aperti
- **Esecuzioni** — storico completo delle esecuzioni con commissioni broker calcolate automaticamente
- **Immagini** — carica screenshot/annotazioni e visualizzale con zoom

### Trade Aperti: Mercato Corrente

Per i trade aperti viene mostrato il **prezzo di mercato corrente** (via Yahoo Finance) con valore di mercato, P&L non realizzato e rendimento corrente %.

### Trade Chiusi: Riepilogo di Chiusura

Per i trade chiusi viene mostrato un riepilogo: data e motivo di chiusura, prezzo/commissione di uscita, **P&L lordo**, commissioni totali, **P&L netto dopo le commissioni**, modalità e aliquota di tassazione del broker, **stima dell'imposta** e netto dopo le imposte.

## Esecuzioni e Commissioni

- Ogni esecuzione registra azione, quantità, prezzo, data, luogo e una nota opzionale
- La **commissione viene calcolata automaticamente dalla configurazione del broker** (importo fisso o percentuale) e salvata con l'esecuzione
- Aggiungi, modifica o elimina esecuzioni dalla pagina di dettaglio; le metriche (P&L a costo medio ponderato, durata, rendimenti) vengono ricalcolate
