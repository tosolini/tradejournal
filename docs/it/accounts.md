# Conti e Broker

## Broker

I broker rappresentano gli intermediari finanziari attraverso cui operi sui mercati. Devi configurare almeno un broker prima di creare un conto.

### Aggiungere un Broker

Vai su **Broker** nella barra laterale e clicca **+ Nuovo broker**.

**Campi disponibili:**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome del broker (es. "Directa SIM") |
| **Commissione** | Modalità: `Fissa` (importo fisso per operazione) o `Percentuale` (% del controvalore) |
| **Valore commissione** | Importo o percentuale |
| **Valuta commissione** | Valuta delle commissioni (default EUR) |
| **Tassazione plusvalenze** | Modalità: `Immediata` (alla chiusura) o `Fine anno` |
| **Aliquota** | Aliquota sulle plusvalenze (default 26%) |

### Mercati / Borse

Ogni broker può avere uno o più **mercati** (borse) abilitati. I mercati definiscono:

- Su quali borse puoi operare tramite quel broker
- Orari di apertura e chiusura
- Fuso orario di riferimento
- Se il mercato è chiuso nel fine settimana

#### Aggiungere un Mercato

Nella scheda del broker, clicca **+ Aggiungi mercato** (scheda Mercati).

> 💡 Per Directa SIM è disponibile un **seed** automatico che importa tutti i mercati dalla pagina ufficiale [directa.it/mercati](https://www.directa.it/mercati). Clicca **Importa mercati Directa** per popolare l'elenco automaticamente.

**Campi del mercato (borsa):**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome del mercato (es. "Borsa Italiana") |
| **MIC** | Codice identificativo ISO 10383 (es. `XMIL`) |
| **Suffisso** | Suffisso del ticker Yahoo Finance (es. `.MI` per Milano) |
| **Paese** | Paese della borsa |
| **Valuta** | Valuta di negoziazione |
| **Fuso orario** | Fuso orario della borsa (es. `Europe/Rome`) |
| **Apertura / Chiusura** | Orari di negoziazione locali |
| **Chiuso nel weekend** | Se `Sì`, il mercato è considerato chiuso di sabato e domenica |

---

## Conti

I conti rappresentano portafogli di trading individuali, collegati a un broker.

### Aggiungere un Conto

Vai su **Conti** e clicca **+ Nuovo conto**.

**Campi disponibili:**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome identificativo (es. "Conto principale", "Paper trading") |
| **Broker** | Broker di riferimento per questo conto (opzionale) |
| **Valuta** | Valuta di denominazione del conto |
| **Saldo iniziale** | Capitale iniziale del conto |
| **Descrizione** | Note opzionali |

### Collegamento Broker-Conto

Un conto è sempre associato a un singolo broker. Questa associazione:

- Applica automaticamente le commissioni configurate sul broker
- Usa l'aliquota fiscale del broker per i calcoli del P&L netto
- Limita l'autocompletamento dei simboli ai mercati abilitati del broker

### Libro Cassa (Cash Ledger)

Seleziona un conto per gestirne il **libro cassa** (depositi e prelievi):

- Registra un **deposito** o un **prelievo** con data, importo e descrizione opzionale
- Il libro cassa mostra i totali **Entrate / Uscite / Saldo** per il conto
- Le voci possono essere modificate o eliminate; il saldo del conto riflette i movimenti

> ⚠️ Un conto con operazioni registrate non può essere eliminato. L'eliminazione di un conto rimuove anche i relativi snapshot e le voci di libro cassa.

---

## Sezioni

- **Broker** — elenco broker con modifica inline e scheda **Mercati** per la gestione delle borse
- **Mercati** — tutte le tue borse con il seed **Importa mercati Directa**
