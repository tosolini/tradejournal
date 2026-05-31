# Ticker e Autocompletamento

Il database ticker permette di cercare e selezionare automaticamente il simbolo corretto quando crei un nuovo trade, evitando errori di digitazione.

## Importare i ticker

### Fonte: Euronext

Euronext pubblica giornalmente un file CSV aggiornato con tutti i titoli negoziati sui propri mercati. Il file include i mercati di **Amsterdam, Bruxelles, Dublino, Lisbona, Londra, Milano, Oslo e Parigi**.

**Come scaricare il file:**

1. Vai su [euronext.com](https://www.euronext.com/it/products/equities/list)
2. Scorri in fondo alla pagina e cerca il link per scaricare la lista completa in formato CSV
3. Il file si chiama tipicamente `Euronext_Equities_YYYY-MM-DD.csv`

### Procedura di importazione

1. Vai su **Ticker** nel menu laterale (sezione Impostazioni)
2. Clicca **Importa CSV**
3. Seleziona il file `Euronext_Equities_*.csv`
4. L'importazione è automatica — al termine vengono mostrate le statistiche:
   - Ticker **nuovi** inseriti
   - Ticker **aggiornati** (già presenti, dati modificati)
   - Righe **saltate** (incomplete o non valide)
   - **Totale** nel database

> ⚠️ Il file CSV di Euronext è separato da `;` (punto e virgola) e contiene 4 righe di intestazione/metadata prima dei dati effettivi. Il sistema le gestisce automaticamente.

## Ricerca e anteprima

Dopo l'importazione, nella stessa pagina puoi cercare i ticker inseriti:

- Digita un simbolo o nome nella barra di ricerca
- La tabella mostra: **Simbolo**, **Nome**, **ISIN**, **Mercato**, **Valuta**

## Autocompletamento nel nuovo trade

Con i ticker importati, il campo **Simbolo** nella finestra "Nuovo Trade" mostra suggerimenti in tempo reale:

1. Inizia a digitare il ticker (es. `ENEL`)
2. Appare un dropdown con i risultati corrispondenti
3. I risultati mostrano: simbolo (in evidenza) + nome + mercato
4. Clicca per selezionare

### Stessa azienda su mercati diversi

Lo stesso titolo può avere simboli diversi su mercati diversi:

| Simbolo | Mercato | Descrizione |
|---|---|---|
| `AAPL` | NASDAQ | Apple Inc. quotata al NASDAQ |
| `1AAPL.MI` | Borsa Italiana | Apple Inc. su Borsa Italiana |

L'autocompletamento mostra entrambe le opzioni con il mercato di riferimento.

## Aggiornare il database

I ticker vengono aggiornati periodicamente da Euronext. Per aggiornare il database:

1. Scarica il nuovo CSV da Euronext
2. Reimporta il file — i ticker esistenti vengono aggiornati (upsert), i nuovi aggiunti

Per cancellare tutti i ticker e ricominciare da zero, usa il bottone **Cancella tutti** nella pagina Ticker.
