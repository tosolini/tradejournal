# Calendario e Mercati

## Sezione Calendario

La sezione **Calendario** contiene due tab:

- **Calendario** — visualizzazione mensile delle operazioni di trading registrate
- **Mercati** — diagramma di Gantt con gli orari di apertura dei mercati finanziari

---

## Tab Mercati (Gantt)

Il Gantt dei mercati mostra in una finestra di **24 ore** (a partire dall'ora corrente) quali mercati sono aperti, stanno per aprire o sono chiusi.

### Come leggere il Gantt

Ogni riga rappresenta un mercato/exchange configurato nei tuoi broker. La barra colorata indica la **finestra di contrattazione**:

| Colore | Significato |
|---|---|
| Verde (teal) | Mercato **aperto** in questo momento |
| Grigio/slate | Mercato **chiuso** in questo momento |
| Rosa/rosso | Mercato **chiuso oggi** (weekend o festivo) |

La linea verticale indica l'**ora corrente** nel tuo fuso orario.

### Fuso orario

Gli orari vengono convertiti automaticamente in base al **fuso orario configurato nel tuo profilo** (Impostazioni → Profilo → Fuso orario).

> ⚠️ Se non hai configurato il fuso orario nel profilo, il Gantt utilizzerà l'ora locale del browser, ma potrebbe non corrispondere al tuo fuso orario effettivo.

### Chiusura per weekend e festivi

I mercati con l'opzione **"Chiuso nel weekend"** attiva vengono mostrati come chiusi il sabato e la domenica.

Le seguenti date sono considerate **festivi globali** di default:
- 1 gennaio (Capodanno)
- 15 agosto (Ferragosto)
- 25 dicembre (Natale)

I mercati **forex e derivati** (LMAX, CME) tipicamente non hanno chiusura nel weekend e rimangono operativi.

### Aggiornamento automatico

Il Gantt si aggiorna in tempo reale. Se lasci aperta la pagina, le barre si spostano man mano che il tempo avanza.

---

## Gestione mercati

I mercati visualizzati nel Gantt provengono dagli **exchange configurati nei broker**. Per aggiungere un mercato:

1. Vai su **Broker** nel menu laterale
2. Seleziona il broker di interesse
3. Clicca su **Mercati** (tab del broker)
4. Clicca **+ Aggiungi Mercato** oppure usa **Importa mercati Directa** per il seed automatico

Vedi la sezione [Conti e Broker](accounts.md) per i dettagli sulla configurazione degli exchange.
