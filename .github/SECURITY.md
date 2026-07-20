# Security Policy

## Versioni supportate

| Versione | Supportata |
|----------|-----------|
| latest (`main`) | ✅ |

## Segnalare una vulnerabilità

Se scopri una vulnerabilità di sicurezza in questo progetto, **non aprire una issue pubblica**.

Segnalala privatamente tramite la funzione **[Security Advisories](../../security/advisories/new)** di GitHub, oppure contatta direttamente i maintainer.

Fornisci le seguenti informazioni nella segnalazione:

- Descrizione del problema e suo impatto potenziale
- Passi per riprodurre la vulnerabilità
- Versioni o componenti interessati
- Eventuale proof-of-concept (se disponibile)

Ci impegniamo a rispondere entro **72 ore** e a rilasciare una patch nel più breve tempo possibile.

## Dipendenze con vulnerabilità note e senza patch

| Pacchetto | CVE | Severity | Mitigazione |
|-----------|-----|----------|-------------|
| `quill` ≤ 1.3.7 (via `react-quill`) | CVE-2021-3163 | Medium | Tutto l'output HTML dell'editor è sanitizzato tramite [DOMPurify](https://github.com/cure53/DOMPurify) prima del rendering. Non esiste una versione corretta di `quill` v1 disponibile upstream. |
| `quill` 2.0.3 (via `react-quill-new`) | CVE-2025-15056 | Low | Tutto l'output HTML dell'editor è sanitizzato tramite [DOMPurify](https://github.com/cure53/DOMPurify) prima del rendering (`NotesPage.tsx:696`). Non esiste una versione corretta di `quill` v2 disponibile upstream. |
