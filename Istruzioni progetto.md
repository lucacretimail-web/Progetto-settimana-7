# Istruzioni Progetto - App Squadre Sportive (TheSportsDB)

Mini app responsive che mostra dati in tempo reale su squadre sportive (calcio, basket, football americano, ecc.) usando l'API di [thesportsdb.com](https://www.thesportsdb.com).

## Struttura del Progetto

- **Obiettivo**: cercare squadre, mostrarne i dettagli e gli eventi collegati (ultimo e prossimo), gestire i preferiti
- **Solo lettura**: nessuna scrittura verso l'API (niente POST/PUT/DELETE)
- **Design libero**: sono richieste struttura e funzionalità; colori, dark mode, forma delle card, ecc. si possono migliorare a piacere

### Tre livelli di complessità

- **Versione base**: pagina responsive, ricerca squadre, lista di card, ultimo e prossimo evento al click
- **Versione intermedia**: preferiti in localStorage, debounce sulla ricerca, AbortController
- **Versione avanzata** (extra non obbligatori): preferiti caricati all'avvio, eventi ordinati per data, filtro per sport, modale evento, JavaScript modulare

---

## API e dati

### Chiave gratuita

- Consente solo operazioni di **lettura**
- La ricerca è limitata
- Gli eventi mostrano solo le **partite in casa**

### Endpoint principali

| Endpoint | Cosa fa |
|----------|---------|
| `searchteams` | Ricerca e lista squadre |
| `eventsnext` | Prossimo evento della squadra |
| `eventslast` | Ultimo evento giocato |

### Campi squadra (classe/oggetto `Squadra`)

- `idTeam`
- `strTeam`
- `strBadge`
- `strLeague`
- `strCountry`
- `strSport`

**Nota**: i nomi dei campi devono combaciare con quelli dell'API, altrimenti non funziona.

---

## Versione Base

### Pagina responsive
- Sviluppata idealmente con **Bootstrap**
- Layout ottimizzato per **mobile**, **tablet** (circa 768-1200px) e **desktop**

### Ricerca squadre
- Barra di ricerca (input di testo) con titolo
- Pulsante "Cerca" opzionale
- Chiamata all'endpoint `searchteams` con `fetch` e `async/await`
- Gestione degli errori con `try/catch`
- **Spinner** durante il caricamento e **alert** in caso di errore

**Modalità di avvio della ricerca** (a scelta del team):
- solo su `change`, con debounce
- solo al click del pulsante
- entrambe

### Lista squadre
- Card con logo, nome, paese e altri dettagli
- Al click su una card si caricano **ultimo evento** e **prossimo evento** della squadra selezionata
  - in parallelo, oppure con due chiamate separate
- **Nessuna squadra predefinita**: all'avvio l'app parte vuota, le squadre compaiono dopo la ricerca

---

## Extra

Tutto quello che segue va oltre la versione base.

### Versione Intermedia (estensioni consigliate)

**Preferiti**
- Aggiunta ai preferiti tramite icona (stellina) o pulsante
- Salvataggio in **localStorage** (ad esempio una collezione di oggetti squadra)
- Aggiunta e rimozione aggiornano anche il localStorage

**Debounce sulla ricerca**
- La richiesta parte solo dopo circa **400 ms** dall'ultima digitazione

**AbortController**
- Annulla la richiesta in corso quando parte una nuova ricerca

### Versione Avanzata (extra non obbligatori)

- **Preferiti all'avvio**: caricamento dei dettagli di tutte le squadre salvate nei preferiti
- **Ordinamento eventi**: per data, con i prossimi appuntamenti in ordine cronologico
- **Filtro per sport** (Soccer, Basketball, American Football): agisce sul campo `strSport` delle card
- **Modale** con i dettagli dell'evento selezionato
- **Struttura modulare del JavaScript**: file separati per responsabilità

---

## Riepilogo

L'app deve essere:
- ✅ **Web app responsive** che consuma l'API di dati sportivi in sola lettura
- ✅ **Ricerca squadre** con card, ultimo e prossimo evento al click
- ✅ **Gestione degli errori** con spinner e alert
- ✅ **Preferiti** in localStorage, con debounce e AbortController nella versione intermedia
- ✅ **Estendibile** con filtri, ordinamento eventi, modale e codice modulare nella versione avanzata
