# SportsHub — Squadre, partite e risultati

Mini app responsive che cerca una squadra su [TheSportsDB](https://www.thesportsdb.com) e ne mostra le prossime partite
e gli ultimi risultati. Le squadre preferite restano salvate nel browser, con l'agenda dei loro prossimi appuntamenti,
un filtro per sport e una modale con i dettagli di ogni partita.
Progetto della settimana 7 del master EPICODE: OOP e MVC applicati a una web app che legge dati da un'API.

---

## ▶️ Avvio

La pagina usa i moduli JavaScript (`type="module"`), che il browser non carica da `file://`: va aperta da un server locale.

- Con Live Server di VS Code: tasto destro su `index.html` → «Open with Live Server».
- Dal terminale, nella cartella del progetto: `python3 -m http.server 5501`, poi <http://localhost:5501>.

Serve la connessione a internet: Bootstrap arriva dalla CDN e i dati da TheSportsDB.

---

## 📋 Piano d'azione

Il progetto segue i tre livelli della consegna (**base → intermedia → avanzata**), più una fase di preparazione
e una finale di compattazione e verifica. Qui c'è quello che è stato realizzato; il piano completo, con le decisioni
e i loro motivi, sta in `Docs/Piano di sviluppo.md`.

### Fase 0 — Preparazione
1. Struttura MVC con moduli ES fin dal primo giorno: `script.js` è il controller, `js/modello/` le classi,
   `js/vista/` le funzioni che disegnano la pagina.
2. Design system in `style.css`: colori campionati dagli screenshot del riferimento, interlinea 1,6,
   contenuto largo al massimo 1060 px. Bootstrap 5.3.3 da CDN, con l'integrità dei file controllata (SRI).
3. Testata misurata sugli screenshot: fascia blu alta 234 px, titolo «SportsHub», sottotitolo e ricerca larga 540 px.

### Fase 1 — Versione base
4. Ricerca con il pulsante «Cerca» o con Invio: `fetch` con `async/await`, `try/catch`, spinner durante il caricamento
   e avviso rosso in caso di errore.
5. Card della squadra: stemma, nome, lega e paese, come nel riferimento.
6. Pannello della squadra: al clic su una card, «Prossimi eventi» e «Ultimi risultati» arrivano con due chiamate in parallelo
   (`Promise.allSettled`): se una fallisce, l'altra colonna resta.
7. Client dell'API con cache di 5 minuti, tetto di 9 richieste al minuto e timeout di 8 secondi.

### Fase 2 — Versione intermedia
8. **Preferiti**: pulsante «☆ Aggiungi ai preferiti» (giallo) che diventa «✓ Già nei preferiti», e «🗑 Rimuovi» sulle card salvate.
   Le squadre si salvano nel `localStorage` e ricompaiono all'apertura.
9. **Debounce**: mentre si scrive, la ricerca parte 400 ms dopo l'ultimo tasto.
10. **AbortController**: una ricerca nuova annulla quella ancora in corso; lo stesso vale per il pannello.

### Fase 3 — Versione avanzata
11. **Agenda «📅 Prossimi appuntamenti»**: all'avvio si carica la prossima partita di ogni preferito, in ordine di data.
12. **Ordinamento per data**: prossimi eventi dal più vicino, ultimi risultati dal più recente.
13. **Filtro per sport** (Calcio, Basket, Football americano): agisce sul campo `strSport` delle card dei preferiti e dei risultati.
14. **Modale** con i dettagli della partita: squadre con lo stemma, punteggio, data e ora, competizione, stagione, stadio, stato.
15. **JavaScript modulare**: già dalla fase 0, un file per responsabilità.

### Fase 4 — Compattazione
16. Commenti di una riga per blocco, getter su una riga, regole CSS ripetute messe in comune
    (superfici bianche, liste, pulsanti, stemmi, contorno del focus).
17. `console.log` solo nei punti chiave: azioni dell'utente, cambi di stato, chiamate all'API ed errori.
18. Da 1488 a 1176 righe in tutto (−21%), mentre si aggiungeva la versione avanzata.

### Fase 5 — Analisi e verifica
19. Misure della pagina confrontate al pixel con gli screenshot del riferimento.
20. Ogni file provato nel browser appena scritto; prova completa di ogni fase con l'API vera.
21. Accessibilità controllata con axe: nessuna violazione (dettagli in «✔️ Verifica»).

---

## 🗂️ Struttura dei file

| File | Strato | Scopo |
|------|--------|-------|
| `index.html` | Vista | Le sezioni della pagina e i `<template>` di card, partita e modale |
| `style.css` | Vista | Lo stile sopra Bootstrap, in CSS annidato, nell'ordine della pagina |
| `script.js` | Controller | Legge gli eventi, cambia lo stato, chiama il modello e ridisegna |
| `js/modello/campi.js` | Modello | Lettura dei dati in arrivo da fuori: id, testi, URL `https` |
| `js/modello/squadra.js` | Modello | Classe `Team` |
| `js/modello/partita.js` | Modello | Classi `Match` e `PlayedMatch` |
| `js/modello/preferiti.js` | Modello | Classe `FavoriteTeams`, salvata nel `localStorage` |
| `js/modello/api.js` | Modello | Classe `SportsDbApi`: tutte le chiamate a TheSportsDB |
| `js/vista/comune.js` | Vista | Pezzi comuni: template, stemmi, spinner, messaggi, errori, annunci |
| `js/vista/squadre.js` | Vista | Card dei preferiti e dei risultati |
| `js/vista/partite.js` | Vista | Agenda e pannello della squadra |
| `js/vista/modale.js` | Vista | Modale della partita |
| `Docs/` | — | Consegna e piano di lavoro |

Le dipendenze vanno in un verso solo: il controller importa modello e vista, la vista non importa mai il modello
(legge solo i getter degli oggetti che riceve).

---

## 🧠 Modello (OOP)

Ogni classe tiene i suoi dati in **campi privati** (`#id`, `#name`…): da fuori si leggono con i getter e non si cambiano
(incapsulamento). Gli oggetti nascono solo da `fromApi`, che controlla i dati una volta sola, al bordo, e scarta quelli
incompleti scrivendolo in console.

| Classe | Cosa fa |
|--------|---------|
| `Team` | Una squadra. `toJSON()` la riporta nella forma dell'API, così il `localStorage` la rilegge da `fromApi` (senza `toJSON`, `JSON.stringify` darebbe `{}`, perché i campi privati non si vedono) |
| `Match` | Una partita da giocare: squadre, inizio (con la `Z` aggiunta a `strTimestamp`, che è in UTC), competizione, stadio, stato |
| `PlayedMatch` | **Estende** `Match` e aggiunge il punteggio: è l'unica sottoclasse del progetto |
| `FavoriteTeams` | La collezione dei preferiti: **contiene** una `Map` id → `Team` (composizione) e si salva a ogni modifica |
| `SportsDbApi` | Le tre chiamate all'API, con cache, tetto di richieste, timeout e annullamento |

**Ereditarietà e polimorfismo.** `Match.fromApi` sceglie la classe dal punteggio; la vista tratta le due classi allo
stesso modo e legge `score`, che vale `null` finché la partita non è giocata:

```js
export class Match {
  get score() { return null; }
  static fromApi(raw) {
    // ...
    return home === null || away === null ? new Match(fields) : new PlayedMatch(fields, { home, away });
  }
}

class PlayedMatch extends Match {
  #homeScore;
  #awayScore;
  get score() { return { home: this.#homeScore, away: this.#awayScore }; }
}
```

---

## 🌐 API — TheSportsDB

Chiave gratuita `123` (pubblica, scritta nella documentazione), solo letture. Tutte le chiamate passano da `SportsDbApi`.

| Cosa | Endpoint | Chiave della lista | Diventa |
|------|----------|--------------------|---------|
| Cerca squadre | `searchteams.php?t=<nome>` | `teams` | `Team[]` |
| Prossimi eventi | `eventsnext.php?id=<idTeam>` | `events` | `Match[]` |
| Ultimi risultati | `eventslast.php?id=<idTeam>` | **`results`** | `Match[]`, di solito `PlayedMatch` |

**Come funziona una chiamata:** indirizzo → cache (5 minuti) → tetto di richieste → `fetch` che si ferma dopo 8 secondi
o quando il controller annulla (`AbortSignal.any`) → lista dalla sua chiave (`null` vuol dire nessun risultato) →
oggetti del modello. Cache e registro delle richieste stanno nel `sessionStorage`, così sopravvivono ai ricaricamenti
di Live Server.

**Limiti della chiave gratuita** (misurati il 20/11/2026):
- una sola squadra per ricerca: «Lakers» dà Roosevelt, «Los Angeles Lakers» dà i Lakers; per questo il segnaposto
  della ricerca suggerisce i nomi completi;
- un evento per lista;
- passano 10 richieste al minuto (la documentazione dice 30), poi Cloudflare blocca per due minuti.
  L'app si ferma a 9 e dice tra quanti secondi riprovare.

Gli errori hanno un codice (`offline`, `network`, `timeout`, `rate-limit`, `http`, `format`) e la vista mostra il testo giusto.
Il blocco di Cloudflare arriva senza le intestazioni CORS, quindi il browser lo vede come una rete assente: il messaggio
lo spiega. Il dettaglio è in `Docs/Piano di sviluppo.md`: endpoint e risposte in «Fatti verificati», errori in
«Modello (OOP)» → `SportsDbApi`.

---

## 🧩 CSS — `style.css`

Bootstrap fa la griglia (`row-cols-1 row-cols-md-2 row-cols-lg-3`), lo spinner, l'avviso rosso e la modale.
`style.css` fa tutto il resto, in un solo file ordinato come la pagina: token → focus → layout → testata → filtro →
titoli → stati → elementi comuni → card → agenda → pannello → partite → modale.

### CSS annidato

L'indentazione ricalca l'HTML e i modificatori BEM si scrivono con `&`:

```css
.team-card {
  .team-card__favorite {
    margin-top: auto;
    &.team-card__favorite--remove {
      border-color: var(--color-remove-border);
      background-color: var(--color-remove-bg);
    }
  }
}
```

Convenzioni:
- Colori, raggi, ombre e misure ricorrenti sono token in `:root`; un ponte (`--bs-body-*`) li passa a Bootstrap.
- Gli stati stanno dentro l'elemento che cambiano: `:is(.detail, .agenda) & { … }`, `.match__open:hover & { … }`.
- Le regole uguali in più punti stanno in un posto solo con `:is()`: superfici bianche, liste, pulsanti, stemmi.
- Le dichiarazioni vanno prima dei blocchi annidati; le regole di una sola dichiarazione stanno su una riga.

### Responsive

- Card: una colonna sul telefono, due da 768 px, tre da 992 px. L'ultima card rimasta sola nella riga si allarga,
  come nel riferimento a 768 px (`flex-grow: 1`).
- Pannello: le due colonne si affiancano da 768 px.
- Testata uguale a ogni larghezza; la ricerca occupa al massimo 540 px.
- Nessuno scorrimento orizzontale a 360, 768, 1200 e 1440 px.

---

## ⚙️ JavaScript

Lo **stato** è un oggetto fatto di unioni (`status: 'idle' | 'loading' | 'ok' | 'error'`), così non esistono
combinazioni impossibili. Ogni cambio passa da `setState(parte, valore)`, che scrive il log e ridisegna:
il disegno dipende solo dallo stato. In fondo a `script.js` le funzioni `init…` partono nell'ordine della pagina.

| Funzione | Come funziona |
|----------|---------------|
| Ricerca (`initSearch`) | Parte con «Cerca» o Invio, oppure 400 ms dopo l'ultimo tasto. Il minimo di 3 lettere sta solo nell'HTML (`minlength`). Il campo vuoto riporta il messaggio iniziale |
| Annullamento (`restart`) | Ricerca, agenda e pannello hanno un `AbortController` ciascuno: una richiesta nuova annulla la vecchia, che non mostra niente |
| Apri squadra (`openTeam`) | Colonne in caricamento, focus sul titolo del pannello, due chiamate insieme, partite in ordine di data |
| Preferiti (`addFavorite`, `removeFavorite`) | Ridisegnano i due elenchi, spostano il focus e lo annunciano ai lettori di schermo; poi aggiornano l'agenda |
| Agenda (`loadAgenda`) | La prossima partita di ogni preferito, chieste insieme, unite per id (due preferiti che giocano tra loro) e in ordine di data; le squadre che non arrivano diventano un avviso |
| Filtro (`initSportFilter`) | Ridisegna preferiti e risultati senza richieste; il valore iniziale si legge dal form, perché il browser può ricordarlo |
| Modale (`initMatchModal`) | Bootstrap la apre dal pulsante della partita; il controller la riempie con la partita già caricata, senza richieste |
| Clic sulle card (`handleTeamClick`) | Un solo listener per elenco: la squadra da `data-team-id`, l'azione da `data-action` |

I dati dell'API entrano nella pagina solo come testo (`textContent`), mai come HTML: un nome di squadra come
`<img src=x onerror=…>` resta testo.

---

## ♿ Accessibilità

- Titoli in ordine (h1, h2, h3), sezioni con il loro titolo, pulsanti veri per ogni azione.
- La card intera si apre cliccando ovunque (il pulsante del nome la copre con `::after`), e il contorno del focus
  gira attorno a tutta la card; il pulsante dei preferiti sta sopra e non è annidato.
- Nome accessibile completo: «Rimuovi Arsenal dai preferiti», con il testo visibile in testa (WCAG 2.5.3).
- Spinner, messaggi ed errori stanno in contenitori `role="status"`; aggiunte e rimozioni si annunciano.
- Focus: resta sul pulsante dopo «Aggiungi», va al titolo dei preferiti dopo «Rimuovi», al titolo del pannello quando
  si apre una squadra; chiusa la modale torna alla partita da cui era partita.
- Filtro: il radio vero resta raggiungibile con la tastiera; la scelta attiva ha anche una ✓, non solo il colore.
- Stemmi con `alt=""` (il nome è subito accanto); senza stemma, un cerchio con l'iniziale.
- Il sollevamento delle card c'è solo con il mouse e senza `prefers-reduced-motion`.

---

## 🎨 Palette

| Uso | Colore |
|-----|--------|
| Blu della testata, titoli, righe | `#193366` |
| Sfondo della pagina | `#f4f6fa` |
| Card, pannelli, modale | `#ffffff` |
| Testo | `#1a1a1a` |
| Testo secondario | `#666666` |
| Separatori | `#eeeeee` |
| Punteggio | `#2d864a` (bianco sopra: contrasto 4,55:1) |
| «Aggiungi ai preferiti» | `#f0c430` |
| «Già nei preferiti» | `#e8e8eb` |
| «Rimuovi» | fondo `#ffe5e5`, bordo `#cc4444`, testo `#aa0000` |

---

## ✅ Riepilogo requisiti

**Base**
- ✅ Pagina responsive con Bootstrap, ottimizzata per telefono, tablet e desktop.
- ✅ Ricerca con campo, titolo e pulsante «Cerca».
- ✅ `searchteams` con `fetch`/`async-await`, `try/catch`, spinner e avviso in caso di errore.
- ✅ Card con stemma, nome, lega e paese.
- ✅ Al clic sulla card, ultimo e prossimo evento con due chiamate in parallelo.

**Intermedia**
- ✅ Preferiti con pulsante, salvati nel `localStorage` come oggetti squadra.
- ✅ Debounce di 400 ms sulla ricerca.
- ✅ `AbortController` per annullare le richieste superate.

**Avanzata**
- ✅ All'avvio, i prossimi appuntamenti di tutti i preferiti.
- ✅ Eventi ordinati per data.
- ✅ Filtro per sport (Soccer, Basketball, American Football) sul campo `strSport`.
- ✅ Modale con i dettagli della partita.
- ✅ JavaScript diviso in moduli per responsabilità.

**Dalla lezione**
- ✅ Solo letture verso l'API.
- ✅ Nessuna squadra predefinita: all'avvio ci sono solo i preferiti salvati dall'utente.
- ✅ Aggiunte e rimozioni aggiornano anche il `localStorage`.

---

## ✔️ Verifica

Le prove sono state fatte in Chrome headless, pilotato con il DevTools Protocol, sulla pagina servita in locale.

- **Riferimento**: testata alta 234 px con la ricerca da 155 a 194 px, card di 343 × 273 px con il pulsante a 219 px
  dall'alto, badge del punteggio 46 × 19 px: le misure coincidono con gli screenshot, entro un pixel.
- **Fase 1**: ricerca, cache, nessun risultato, pannello con due chiamate sovrapposte, errori `offline`, `network`,
  `timeout` (dopo 8 s esatti) e `rate-limit` (alla decima ricerca in un minuto, senza mandarla).
- **Fase 2**: «Arsenal» scritto lettera per lettera manda una sola richiesta; preferiti salvati e ricaricati senza
  richieste; dati rotti nel `localStorage` → si parte vuoti; una ricerca superata risulta «(canceled)».
- **Fase 3**: agenda in ordine di data, filtro con i suoi messaggi, modale aperta da agenda e pannello e chiusa con Esc
  (il focus torna alla partita), ordinamento provato con risposte finte in disordine.
- **Compattazione**: 8 stati della pagina fotografati prima e dopo, a 1200 e 360 px, in due giri: 0 pixel diversi.
- **Accessibilità**: axe-core 4.10.2, nessuna violazione (41 regole superate).
- **Console**: nessun errore; nessuno scorrimento orizzontale a 360, 768, 1200 e 1440 px.

---

## 📁 Materiale

Consegna e piano di lavoro sono in `Docs/`.
