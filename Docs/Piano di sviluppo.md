# Piano di sviluppo — SportsHub (Progetto settimana 7, EPICODE)

## Contesto

Costruzione di una mini app responsive che cerca squadre su TheSportsDB, mostra prossimi eventi e ultimi risultati e gestisce i preferiti, su tre livelli (base, intermedia, avanzata). 
Il piano costruisce l'app in fasi, ognuna consegnabile, con regole salde di scaffolding e regole apprese di scrittura del codice.

**Decisioni**
- **Nomi:** file, cartelle e commenti in italiano; codice in inglese (`Team`, `Match`…). Mai una classe `Event`, che oscura il costruttore del DOM.
- **Stile:** Bootstrap 5.3.3 da CDN, con SRI, più uno `style.css` annidato con i colori del riferimento.
- **Ereditarietà:** una sola sottoclasse, `PlayedMatch extends Match`; il resto è composizione.
- **Versione avanzata:** «caricamento dettagli dei preferiti all'avvio» si legge come un'agenda dei prossimi appuntamenti dei preferiti, ordinata per data.
- **Git:** commit iniziale e commit finale.

## Fatti verificati — piccolo audit dell'API con l'AI

**API (`https://www.thesportsdb.com/api/v1/json/123/`)**
- **Tempi e CORS:** risponde in circa 0,17 s; CORS aperto (`access-control-allow-origin: *`).
- **Ricerca (`searchteams.php?t=`):** restituisce `teams`, oppure `null` se non trova niente.
  - Con la chiave gratuita esce **una sola squadra**: «Lakers» dà Roosevelt, «Inter» dà Intercity.
  - La risposta pesa 24 KB, perché contiene le descrizioni in 12 lingue.
- **Eventi:**
  - `eventsnext.php?id=` restituisce `events`;
  - `eventslast.php?id=` restituisce **`results`**, non `events`;
  - un evento per lista;
  - i punteggi sono stringhe oppure `null`;
  - `strTimestamp` è in UTC ma senza la `Z`.
- **Limite di frequenza:**
  - dopo circa 10 richieste in un minuto Cloudflare risponde 429 («error code: 1015», `retry-after` ~113 s);
  - la risposta 429 è **senza intestazioni CORS**, quindi nel browser arriva come `TypeError: Failed to fetch`.
- **Stemmi:** l'originale pesa 127 KB; `/small` (200 px) 46 KB; `/tiny` (100 px) 13,6 KB.

**Riferimenti**
- **Colori campionati:**
  - navy `#193366`, pagina `#f4f6fa`, card `#fff`;
  - «Rimuovi»: fondo `#ffe5e5`, bordo `#cc4444`, testo `#aa0000`;
  - punteggio `#2d864a`.
- **Larghezza:** il contenuto è largo 1060 px, cioè il `.container` di Settimana 5 (1100 px meno 20 per lato).
- **Griglia:** a 768 px la terza card, sola nella riga, è larga quanto tutta la riga.

## Architettura

### File (stato finale)
```
Progetto-settimana-7/
├── index.html          Vista statica: sezioni, <template> di card e partite, modale
├── style.css           stile sopra Bootstrap, annidato come l'HTML
├── script.js           Controller (procedurale, type="module"): stato, init… nell'ordine della pagina
├── js/
│   ├── modello/        Model (OOP)
│   │   ├── campi.js        lettura dei campi ai bordi (id, testo, URL https)
│   │   ├── squadra.js      class Team
│   │   ├── partita.js      class Match, class PlayedMatch extends Match
│   │   ├── preferiti.js    class FavoriteTeams
│   │   └── api.js          class SportsDbApi
│   └── vista/          View (funzioni)
│       ├── comune.js       template, stati, errori, stemmi, annunci
│       ├── squadre.js      card, preferiti, risultati
│       ├── partite.js      pannello, agenda, voce partita
│       └── modale.js       modale dell'evento
└── README.md
```

**Moduli sin dall'inizio.**
- Un file unico che tiene insieme modello, vista e controller «tiene insieme cose diverse», quindi va diviso. Così la voce avanzata «JS modulare» è già fatta senza riscritture.
- Le dipendenze vanno in un verso solo: `script.js` importa da `modello/` e `vista/`; la vista non importa il modello e legge solo i getter.
- Le pagine vanno servite via HTTP: Live Server sulla porta 5501.

### Modello (OOP)

**`campi.js`**
- `readId`: accetta solo cifre, perché l'id finisce negli URL e nei `data-*`.
- `readText`: testo senza spazi in testa e in coda, oppure `''`.
- `readHttpsUrl`: un `URL` valido con protocollo `https:`, altrimenti `null`.

**`Team`**
- Campi privati `#id #name #badge #league #country #sport`, impostati con `constructor({…})`.
- **`static fromApi(raw)`** restituisce `Team | null`: id e nome sono obbligatori, e gli scarti finiscono nel log.
- **Getter** per tutti i campi.
- **`toJSON()`** restituisce `{ idTeam, strTeam, strBadge, strLeague, strCountry, strSport }`.
  - Senza, `JSON.stringify` darebbe `{}`, perché i `#campi` non si vedono.
  - Quello che torna dal localStorage passa di nuovo da `fromApi`: un solo percorso di validazione, con i nomi dell'API come chiede la consegna.

**`Match`**
- Campi privati `#id #name #homeTeam #awayTeam #kickoff #hasTime`. Nella fase 3 si aggiungono `#league #season #venue #status #homeBadge #awayBadge`.
- **`static fromApi(raw)`** sceglie la classe: con entrambi i punteggi interi ≥ 0 crea una `PlayedMatch`, altrimenti una `Match`; se mancano dati restituisce `null`.
- **`readKickoff`** ricava la data:
  - prima `strTimestamp` + `Z`; senza la `Z`, in Italia l'orario sbaglierebbe di un'ora;
  - poi `dateEvent` + `strTime`;
  - se c'è solo la data, mezzogiorno UTC e `hasTime = false`.
- **`get score()`** restituisce `null`.
- Nella fase 3, `static byKickoff(a, b)` per ordinare.

**`PlayedMatch extends Match`**
- Campi privati `#homeScore #awayScore`.
- `get score()` restituisce `{ home, away }`; il trattino di «3 – 1» lo mette la vista.
- È l'unica `extends`. Il modulo esporta solo `Match`.

**`FavoriteTeams` (fase 2)**
- `#teams` è una `Map` id → Team: serve `has` per ogni card dei risultati e conserva l'ordine di inserimento.
- `static load()`: con JSON rotto o storage negato restituisce una collezione vuota e scrive un log.
- `list`, `size`, `has`, `get`, `add`, `remove`.
- `#save()` sta in un `try/catch`, come `saveTheme` di Settimana 5. Chiave `sportshub-favorites`.

**`SportsDbApi`**
- La tabella `ENDPOINTS` raccoglie per ogni chiamata il file, il parametro, la chiave della lista (`results` per `eventslast`) e la factory.
- **Metodi pubblici:** `searchTeams(query, { signal })`, `getNextMatches(id, { signal })`, `getLastMatches(id, { signal })`.
- **Privati:** `#request`, `#cache`, `#sentAt`.

| Costante | Valore | Perché |
|---|---|---|
| `REQUEST_TIMEOUT_MS` | 8000 | risposta tipica 0,17 s: oltre 8 s la richiesta è persa |
| `CACHE_TTL_MS` | 5 min | partite e risultati cambiano solo dopo una gara |
| `RATE_LIMIT` | 9 richieste in 60 s | Cloudflare blocca per ~2 min dopo 10 |

**Percorso di una richiesta:**
1. URL con `URLSearchParams`; il testo della ricerca va in minuscolo, così la cache riconosce le ricerche uguali.
2. Se la voce in cache è ancora valida, si risponde da lì.
3. Se il tetto è pieno: errore `rate-limit` con `retryIn`, senza mandare niente.
4. `fetch` con `AbortSignal.any([signal, AbortSignal.timeout(…)])`. Nella fase 1 c'è solo il timeout.
5. Se la risposta non è `ok`, errore `http`; se il JSON è rotto, errore `format`.
6. `null` diventa `[]`; poi factory e `filter(Boolean)`.
7. Il risultato va in cache.

**Cache e registro delle richieste nel `sessionStorage`.**
- Contiene la lista grezza dell'API; le factory girano a ogni lettura.
- Il motivo: Live Server ricarica la pagina a ogni salvataggio. Con un registro solo in memoria il tetto ripartirebbe da zero e scatterebbe il blocco di Cloudflare.

**Errori.**
- Sono `Error` con un campo `code`, senza sottoclassi: `offline`, `network`, `timeout`, `rate-limit`, `http`, `format`.
- `AbortError` passa com'è.
- `TypeError` diventa `offline` se `navigator.onLine` è falso, altrimenti `network`: è il caso del 429 senza CORS.
- Nessun nuovo tentativo automatico.

### Vista (funzioni)

**Regole comuni.**
- Ogni elemento nasce da un `<template>`.
- I dati dell'API entrano solo con `textContent`, `src`/`srcset` già validati o `dateTime`; mai `innerHTML`.
- Si ridisegna con `replaceChildren()`, e il log riporta quanti elementi.

**`comune.js`**
- `cloneTemplate` e `fillFields(root, fields)`, che riempie gli elementi `[data-field]`.
- `setBadge(img, url)`:
  - `/tiny` a 1x e `/small` a 2x, con `width`/`height` e caricamento pigro;
  - senza stemma, o se l'immagine non carica, un cerchio al suo posto.
- `showLoading`: lo spinner di Bootstrap con il testo nascosto.
- `showMessage`.
- `showError`: il testo viene dalla tabella `ERROR_MESSAGES`, indicizzata per `code`.
- `announce`: scrive in `#announcer`.

**`squadre.js`**
- `renderFavorites`.
- `renderResults`, con una tabella indicizzata dallo stato della ricerca:
  - `idle`: «Inizia cercando una squadra qui sopra.»;
  - `loading`: lo spinner;
  - `error`: l'alert;
  - nessun risultato: «Nessuna squadra trovata per «…».»;
  - con risultati: la riga «1 squadra trovata. L'API gratuita ne mostra una per ricerca: se non è quella giusta, scrivi il nome completo.» e le card.
- `focusFavoriteButton`.
- **Privati:** `createTeamCard` e la tabella `FAVORITE_BUTTONS`:
  - `add`: «☆ Aggiungi ai preferiti»;
  - `saved`: «✓ Già nei preferiti», con `aria-disabled`;
  - `remove`: «🗑 Rimuovi»;
  - il nome accessibile comprende la squadra, per esempio «Rimuovi Inter Milan dai preferiti».

**`partite.js`**
- `renderDetail`, `renderAgenda` (fase 3) e `formatScore`.
- **Privati:**
  - `renderMatchList`;
  - `createMatchItem`, che aggiunge il badge del punteggio solo se `match.score` c'è: le due classi passano dalla stessa funzione;
  - `DATE_FORMAT` (`it-IT`, gg/mm/aaaa);
  - i testi «Nessun evento in programma» e «Nessun risultato recente».

**`modale.js` (fase 3)**
- `fillMatchModal(modal, match)`.
- `STATUS_LABELS`: `NS` Non iniziata, `FT` Finita, `AET` Finita ai supplementari, `PEN` Finita ai rigori, `PST` Rinviata, `CANC` Annullata.

**Accessibilità**
- **Card:** il nome è un `button` dentro l'`h3`, e il suo `::after` copre tutta la card. Il pulsante dei preferiti è un fratello (sopra, con `z-index`), mai annidato.
- **Stati:** i contenitori `role="status"` sono separati dalle `ul`.
- **Focus visibile:** colore `--color-focus`, bianco nella testata.
- **Dove va il focus:**
  - dopo «Aggiungi» resta sul pulsante;
  - dopo «Rimuovi» va sull'`h2` dei preferiti;
  - aprendo una squadra va sull'`h2` del pannello.
- **Immagini e icone:** gli stemmi hanno `alt=""` perché il nome è accanto; le emoji hanno `aria-hidden`.
- **Contrasti:** bianco su `#2d864a` dà 4,55:1, quindi quel verde non va schiarito.

### Controller (`script.js`)

**`elements` e `state`.**
- `elements` contiene tutti i `getElementById`, ognuno scritto una volta sola.
- `state` usa unioni:
  - `search`: `idle | loading | ok | error`;
  - `detail`: `null | { team, next, last }`, con ogni colonna in `loading | ok | error`;
  - `favorites` dalla fase 2; `agenda` e `sport` dalla fase 3.

**Funzioni di supporto.**
- `setSearch`, `setDetail`… assegnano lo stato, scrivono il log `[stato]` e ridisegnano.
- `TEAM_ACTIONS = { open, add, remove }` gestisce il clic delegato sulle card, con `closest('[data-action]')` e `closest('[data-team-id]')`.

**Ordine di avvio.** Le `init…` si chiamano in fondo al file, nell'ordine della pagina: `initSearch`, `initSportFilter` (3), `initFavorites` (2), `initAgenda` (3), `initResults`, `initMatchModal` (3).

**Ricerca.**
- Con il pulsante parte subito. Il minimo di 3 lettere sta solo nell'HTML (`minlength`), e il JS lo legge da lì.
- Mentre si scrive (fase 2), debounce di 400 ms sull'evento `input`. Il campo vuoto riporta lo stato `idle`.
- `runSearch` salta una ricerca uguale a quella in corso o già mostrata, annulla la precedente (fase 2) e passa da `loading` a `ok` o `error`. Un `AbortError` si ignora.

**Apri squadra.**
- Le colonne vanno in `loading` e il focus sul pannello.
- Le due chiamate partono insieme con `Promise.allSettled`: se una fallisce, l'altra colonna resta.
- Nella fase 1 una guardia controlla se nel frattempo la squadra è cambiata; nella fase 2 la sostituisce un `AbortController`.

**Aggiungi e rimuovi (fase 2).** `favorites.add` o `remove`, poi si ridisegnano entrambi gli elenchi (e dalla fase 3 l'agenda); infine focus e `announce`.

**Log.** Le etichette sono `[avvio]`, `[ricerca]`, `[api]`, `[stato]`, `[preferiti]`, `[pannello]`, `[agenda]`, `[filtro]`, `[modale]`, `[vista]` e `[modello]`.
- Il log sta in listener, setter, richieste (URL, cache, millisecondi, tetto), localStorage, render e dati scartati.
- Non sta in getter, comparatori e formattatori: girerebbero per ogni card.

### HTML e CSS

**`<head>`**
- `lang="it"`, titolo e description.
- Favicon come data-URI con l'emoji del pallone, come in Settimana 6.
- Il CSS di Bootstrap 5.3.3 con `integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"` e `crossorigin`, poi `style.css`.

**Testata**
- `header.site-header` con `h1`, sottotitolo e `form#search-form[role=search]`.
- Il modulo contiene una `label.visually-hidden`, il campo e il pulsante «Cerca».
- Il campo è `input#search-input` con `type=search`, `required`, `minlength=3`, `maxlength=50` e `autocomplete=off`.
- Segnaposto: «es. Arsenal, Los Angeles Lakers, Real Madrid…». Scostamento voluto dal riferimento: «Lakers» da solo dà Roosevelt.

**`main.container`, nell'ordine:**
1. il filtro (fase 3);
2. `section#favorites` (fase 2);
3. `section#agenda` (fase 3);
4. `section#results`;
5. `section#detail[hidden]`, con due colonne `col-12 col-md-6`;
6. `#announcer` (fase 2);
7. i template `team-card-template` e `match-template`;
8. la modale (fase 3).

**In fondo alla pagina:**
- dalla fase 3, `bootstrap.min.js` 5.3.3 con `integrity="sha384-0pUGZvbkm6XF6gxjEnlmuGrJXVbNuzT9qBBavbLwCsOGabYfZo0T0to5eqruptLy"`, senza Popper;
- `script.js` come modulo.

**Griglia delle card.** Gli elenchi sono `ul.team-list.row.row-cols-1.row-cols-md-2.row-cols-lg-3.g-3`, con `> li { flex-grow: 1 }`: l'ultima card, se resta sola, si allarga come nel riferimento.

**`style.css`**
- **Indice in testa:** token, base, layout, testata e ricerca, filtro, titoli, card, stati, pannello e partite, agenda, modale.
- **Token in `:root`:** i colori campionati, più `--color-text #1a1a1a`, `--color-muted #666`, `--font-body: Arial…`, `--page-max 1100px`, `--page-gutter 20px`, `--radius 8px` e `--badge-size 100px`. Un ponte `--bs-body-*` collega i token a Bootstrap.
- **Contenitore:** `.container { max-width: var(--page-max) }` vince sui breakpoint di Bootstrap.
- **Scrittura:** classi BEM con i modificatori annidati; gli stati dentro l'elemento che cambiano.
- **Movimento:** il sollevamento della card solo con `(hover: hover)` e senza `prefers-reduced-motion`.
- **Breakpoint:** solo quelli di Bootstrap, 768 e 992.

## Fasi

### Fase 0 — Preparazione (procedura di scaffolding)

**File minimi.**
- `index.html`: head completa, testata con la ricerca, `main` vuoto.
- `style.css`: indice, token, base, layout, testata.
- `script.js`: un commento in testa e `console.log('[avvio] SportsHub: modulo caricato')`.
- `README.md`: cos'è; come si avvia, cioè via Live Server, perché da `file://` il modulo non parte; chiave gratuita e limite di richieste.

**Fatto quando:**
- via HTTP la testata è come il riferimento a 360 e 1440 px;
- la console mostra solo il log d'avvio.

### Fase 1 — Base

**File:** `index.html` (pannello e template), `style.css` (fino al pannello), `script.js`, `js/modello/{campi,squadra,partita,api}.js`, `js/vista/{comune,squadre,partite}.js`.

**Cosa si fa:** ricerca con il pulsante, card dei risultati, pannello con le due colonne caricate in parallelo, spinner, alert, cache e tetto alle richieste.

**Verifica:**
- **Ricerca:**
  - «Arsenal»: spinner, poi una card e una sola richiesta; lo stemma arriva come `/tiny` o `/small`;
  - la stessa ricerca una seconda volta: log `[api] dalla cache`, nessuna richiesta;
  - «zzzz»: il messaggio di nessun risultato.
- **Pannello:**
  - clic sulla card, e Tab+Invio sul nome: in Network le due richieste si sovrappongono;
  - due card aperte di fila: resta l'ultima.
- **Errori:**
  - Network «Offline» dà `offline`;
  - le richieste bloccate danno `network`;
  - una latenza di 10 s dà `timeout` a 8 s;
  - 10 ricerche diverse in un minuto: alla decima «riprova tra N s», e in Network le richieste sono 9.
- **Larghezze:**
  - 1, 2 e 3 colonne di card;
  - a 768 px la terza card è larga tutta la riga, e le colonne del pannello si affiancano;
  - a 360 px nessuno scorrimento orizzontale.

### Fase 2 — Intermedia

**File:** gli stessi, più `js/modello/preferiti.js`.

**Cosa si fa:**
- `Team#toJSON` e `FavoriteTeams`;
- la sezione preferiti prima dei risultati, i pulsanti `add`/`saved`/`remove` e `#announcer`;
- debounce di 400 ms sulla ricerca;
- `AbortController` per ricerca e pannello (la guardia della fase 1 si cancella) e `AbortSignal.any` nell'API.

**Verifica:**
- **Preferiti:**
  - aggiungere Inter Milan, Barcelona e Arsenal: la pagina diventa come gli screenshot, e il pulsante diventa «✓ Già nei preferiti» tenendo il focus;
  - in Local Storage `sportshub-favorites` usa i nomi dei campi dell'API;
  - dopo un ricaricamento i preferiti ci sono ancora, senza richieste;
  - «Rimuovi»: il focus va sul titolo e nei risultati il pulsante torna «Aggiungi»;
  - con `'{rotto'` nello storage l'app parte vuota e scrive un log.
- **Ricerca:**
  - «real madrid»: una sola richiesta, circa 400 ms dopo l'ultimo tasto;
  - «re»: nessuna richiesta;
  - con Slow 3G, due ricerche di fila: la prima risulta «(canceled)».

### Fase 3 — Avanzata

**3a. Ordinamento.**
- `Match.byKickoff`: prossimi eventi in ordine crescente, ultimi risultati in ordine decrescente.
- *Verifica:* con la chiave gratuita ogni lista ha un solo evento, quindi servono tre eventi finti (Network → Override content su `eventsnext.php`).

**3b. Agenda.**
- `section#agenda` «📅 Prossimi appuntamenti», dopo i preferiti, visibile solo se c'è almeno un preferito.
- All'avvio e a ogni aggiunta o rimozione si chiama `getNextMatches` per ogni preferito, in parallelo.
  - Fanno da freno il tetto e la cache: le squadre già in cache non costano richieste.
  - Le squadre bloccate dal tetto si riprovano al giro dopo, con il messaggio «riprova tra N s».
- Gli eventi si uniscono per id (due preferiti che giocano tra loro) e si ordinano per data.
- *Verifica:*
  - con 3 preferiti partono 3 richieste e la lista è in ordine;
  - un ricaricamento entro 5 minuti non manda richieste;
  - un preferito senza partite non ha righe.

**3c. Filtro.**
- `form#sport-filter` con quattro radio: «Tutti» (`""`), «Calcio» (`Soccer`), «Basket» (`Basketball`), «Football americano» (`American Football`).
- Agisce su preferiti e risultati, con un testo apposito quando un elenco filtrato resta vuoto.
- *Verifica:* con Arsenal, Los Angeles Lakers e Roosevelt, ogni scelta lascia la sua squadra; le frecce passano tra le radio; nessuna richiesta.

**3d. Modale.**
- Il markup della modale di Bootstrap e `bootstrap.min.js`.
- Le voci partita del pannello e dell'agenda diventano `button[data-bs-toggle=modal][data-match-id]`; `findMatch` cerca su pannello e agenda.
- `fillMatchModal` mostra:
  - le squadre con stemmi da 64 px;
  - il punteggio, se c'è;
  - data e ora locali;
  - competizione e stagione;
  - stadio e stato.
  - Le righe vuote si nascondono.
- *Verifica:* clic e Invio la aprono; Esc, la X e lo sfondo la chiudono; il focus torna all'evento; nessuna richiesta.

**3e. JS modulare:** già fatto dalla fase 1; resta da descriverlo nel README.

**3f. Chiusura:** README finale e checklist delle regole di scrittura.

## Dove regole e consegna tirano in direzioni diverse

1. **Composizione contro l'OOP della settimana.** Una sola `extends` (`PlayedMatch`). Gli errori sono `Error` con `code`, e `FavoriteTeams` contiene una Map invece di estendere qualcosa.
2. **`toHTML()` dell'esercitazione contro `textContent` e vista funzionale.** Il modello non tocca il DOM; il polimorfismo passa dal getter `score`.
3. **«Alla radice i file della consegna» contro i moduli.** `index.html`, `style.css` e `script.js` restano alla radice; i moduli stanno in `js/`.
4. **`console.log` ovunque contro la compattezza.** Log dove succede qualcosa, non in getter e formattatori.
5. **Nuovi tentativi con attesa crescente contro il limite di 10 al minuto.** Nessun tentativo automatico: si riprova a mano.
6. **AVIF/WebP contro un'API che serve solo PNG.** `/tiny` e `/small` con `srcset`, `width`/`height` e caricamento pigro.
7. **Settimana 6 senza SRI contro «corretto e sicuro».** `integrity` su entrambi i file della CDN.
8. **«Tipi espliciti nelle firme» (pensata per TypeScript).** I tipi sono le classi con le loro factory; ogni funzione esportata ha un commento di una riga.

## Interpretazioni della consegna
- **All'avvio:** l'agenda dei prossimi appuntamenti dei preferiti. I preferiti salvati si vedono già dalla fase 2.
- **«Nessuna squadra predefinita»:** riguarda i risultati. I preferiti li ha salvati l'utente.
- **Filtro:** agisce su preferiti e risultati, non su agenda e pannello, e non manda richieste.
- **Ricerca:** con il pulsante e con il debounce sull'evento `input`. L'evento `change` scatta solo quando si esce dal campo.
- **«Ultimo e prossimo evento»:** si fanno liste, perché con una chiave a pagamento gli eventi sono fino a 5.
- **«Solo partite in casa»:** oggi non è vero (c'è Newcastle vs Arsenal), e nessuna parte del codice ne dipende.
- **Modale:** usa i dati già caricati. Restano fuori immagini, video e spettatori, che spesso valgono `null`.

## Verifica finale 
- **Server:** Live Server sulla porta 5501, oppure `python3 -m http.server 5501` con «Disable cache». Non la 3000, occupata da Colima.
- **Chrome DevTools:**
  - `resize_page` a 360, 768 e 1440 px;
  - `take_screenshot` da affiancare agli screenshot del riferimento;
  - `list_console_messages`: nessun errore;
  - `list_network_requests`: solo le richieste attese, al massimo 9 al minuto;
  - `lighthouse_audit`: accessibilità senza errori axe.
- **Checklist delle regole:**
  - un commento in testa a ogni blocco;
  - dati, testi e selettori scritti una volta sola;
  - niente codice commentato;
  - immagini con `width` e `height`;
  - focus visibile;
  - 360 e 1440 px senza errori.

## File critici
- `script.js`, `index.html`, `style.css`.
- `js/modello/api.js`, `partita.js`, `squadra.js`, `preferiti.js`.
- `js/vista/squadre.js`, `partite.js`, `comune.js`.
