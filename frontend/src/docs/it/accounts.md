# Conti e Broker

## Broker

I broker rappresentano gli intermediari finanziari attraverso cui operi sui mercati. Prima di creare un conto devi configurare almeno un broker.

### Aggiungere un broker

Vai su **Broker** nel menu laterale e clicca **+ Nuovo Broker**.

**Campi disponibili:**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome del broker (es. "Directa SIM") |
| **Sito web** | URL del sito del broker |
| **Commissione** | Modalità: `Fissa` (importo fisso per trade) o `Percentuale` (% sul valore) |
| **Valore commissione** | Importo o percentuale delle commissioni |
| **Valuta commissioni** | Valuta in cui sono espresse le commissioni |
| **Tassazione plus. cap.** | Modalità: `Immediata` (al momento della chiusura) o `Fine anno` |
| **Aliquota** | Percentuale di tassazione delle plusvalenze (default 26%) |

### Mercati / Exchange

Ogni broker può avere uno o più **mercati** (exchange) abilitati. I mercati definiscono:

- Su quali borse puoi negoziare tramite quel broker
- Gli orari di apertura e chiusura del mercato
- Il fuso orario di riferimento
- Se il mercato è chiuso nel weekend

#### Aggiungere un mercato

Nella scheda del broker, clicca **+ Aggiungi Mercato** (tab "Mercati").

> 💡 Per Directa SIM è disponibile un **seed automatico** che importa tutti i mercati dalla pagina ufficiale [directa.it/mercati](https://www.directa.it/mercati). Clicca **Importa mercati Directa** per popolare automaticamente l'elenco.

**Campi exchange:**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome del mercato (es. "Borsa Italiana") |
| **MIC** | Market Identifier Code standard ISO 10383 (es. `XMIL`) |
| **Suffisso** | Suffisso Yahoo Finance/ticker (es. `.MI` per Milano) |
| **Paese** | Paese della borsa |
| **Valuta** | Valuta di negoziazione |
| **Fuso orario** | Timezone della borsa (es. `Europe/Rome`) |
| **Apertura / Chiusura** | Orari di contrattazione locali |
| **Chiuso nel weekend** | Se `Sì`, il mercato è considerato chiuso sabato e domenica |

---

## Conti

I conti rappresentano i singoli portafogli di trading, collegati a un broker.

### Aggiungere un conto

Vai su **Conti** e clicca **+ Nuovo Conto**.

**Campi disponibili:**

| Campo | Descrizione |
|---|---|
| **Nome** | Nome identificativo del conto (es. "Conto principale", "Paper trading") |
| **Broker** | Broker di riferimento per questo conto |
| **Valuta** | Valuta di denominazione del conto |
| **Saldo iniziale** | Capitale iniziale del conto |
| **Descrizione** | Note opzionali |

### Collegamento broker-conto

Un conto è sempre associato a un singolo broker. Questa associazione:
- Applica automaticamente le commissioni configurate nel broker
- Usa l'aliquota di tassazione del broker per i calcoli di P&L netto
- Limita i mercati disponibili all'autocompletamento dei simboli ai mercati del broker
