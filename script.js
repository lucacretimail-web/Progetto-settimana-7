// SportsHub (Controller): legge gli eventi, chiama il modello e ridisegna la vista; è un modulo ES, va servito via HTTP.
// Ordine: elementi, stato, ridisegno, richieste, azioni, init… nell'ordine della pagina
import { SportsDbApi } from './js/modello/api.js';
import { FavoriteTeams } from './js/modello/preferiti.js';
import { Match } from './js/modello/partita.js';
import { renderFavorites, renderResults, focusFavoriteButton } from './js/vista/squadre.js';
import { renderAgenda, renderDetail } from './js/vista/partite.js';
import { fillMatchModal } from './js/vista/modale.js';
import { announce } from './js/vista/comune.js';

// Attesa dopo l'ultimo tasto prima di cercare: 400 ms, come chiede la consegna
const SEARCH_DEBOUNCE_MS = 400;
const api = new SportsDbApi();

// Elementi della pagina: ogni id compare solo qui
const byId = (id) => document.getElementById(id);
const elements = {
  searchForm: byId('search-form'),
  searchInput: byId('search-input'),
  sportFilter: byId('sport-filter'),
  favorites: { title: byId('favorites-title'), status: byId('favorites-status'), list: byId('favorites-list') },
  agenda: { section: byId('agenda'), status: byId('agenda-status'), list: byId('agenda-list') },
  results: { status: byId('results-status'), list: byId('results-list') },
  detail: {
    section: byId('detail'),
    title: byId('detail-title'),
    next: { status: byId('next-status'), list: byId('next-list') },
    last: { status: byId('last-status'), list: byId('last-list') },
  },
  modal: { root: byId('match-modal'), title: byId('match-modal-title'), body: byId('match-modal-body') },
};

// Stato fatto di unioni, così non esistono combinazioni impossibili: search ha status 'idle' | 'loading' | 'ok' | 'error';
// agenda (null senza preferiti) e le colonne next e last di detail hanno status 'loading' | 'ok' | 'error'; sport '' vale tutti
const state = { favorites: FavoriteTeams.load(), sport: '', search: { status: 'idle' }, agenda: null, detail: null };
// Richieste annullabili: la ricerca, l'agenda e le partite del pannello
const aborts = { search: null, agenda: null, detail: null };
// Filtri delle card: sport scelto (con «Tutti» passano tutte) e squadra già nei preferiti
const teamFilters = { isVisible: (team) => !state.sport || team.sport === state.sport, isFavorite: (team) => state.favorites.has(team.id) };

// Ridisegno di ogni parte dello stato: il disegno dipende solo dallo stato
const RENDER = {
  search: (search) => renderResults(elements.results, search, teamFilters),
  agenda: (agenda) => renderAgenda(elements.agenda, agenda),
  detail: (detail) => renderDetail(elements.detail, detail),
};

function setState(key, value) {
  state[key] = value;
  console.log(`[stato] ${key}:`, value);
  RENDER[key](value);
}

// Elenchi: preferiti e risultati insieme, perché il pulsante dei risultati dipende dai preferiti e il filtro da entrambi
function renderTeams() {
  renderFavorites(elements.favorites, state.favorites.list, teamFilters.isVisible);
  RENDER.search(state.search);
}

// Nuova richiesta per una parte: annulla la vecchia ancora in corso e dà il segnale della nuova
function restart(key) {
  aborts[key]?.abort();
  aborts[key] = new AbortController();
  return aborts[key].signal;
}

// Cerca: una ricerca superata da una più nuova (AbortError, riconosciuto dal nome) non mostra niente
async function runSearch(query) {
  if (query === state.search.query && state.search.status !== 'error') return console.log('[ricerca] già in corso o mostrata:', query);
  const signal = restart('search');
  setState('search', { status: 'loading', query });
  try {
    setState('search', { status: 'ok', query, teams: await api.searchTeams(query, { signal }) });
  } catch (error) {
    if (error.name === 'AbortError') return console.log('[ricerca] superata da una più nuova:', query);
    console.error('[ricerca] errore:', error.code ?? error);
    setState('search', { status: 'error', query, error });
  }
}

// Colonna dal risultato di allSettled: le partite in ordine, oppure l'errore
function toColumn(settled, compare) {
  if (settled.status === 'fulfilled') return { status: 'ok', matches: settled.value.toSorted(compare) };
  console.error('[pannello] errore:', settled.reason.code ?? settled.reason);
  return { status: 'error', error: settled.reason };
}

// Apri squadra: colonne in caricamento, focus sul titolo, le due chiamate insieme (se una fallisce l'altra resta);
// prossimi eventi dal più vicino, ultimi risultati dal più recente
async function openTeam(team) {
  console.log('[pannello] apro:', team.name);
  const signal = restart('detail');
  setState('detail', { team, next: { status: 'loading' }, last: { status: 'loading' } });
  elements.detail.title.focus();
  const [next, last] = await Promise.allSettled([api.getNextMatches(team.id, { signal }), api.getLastMatches(team.id, { signal })]);
  if (signal.aborted) return;
  setState('detail', { team, next: toColumn(next, Match.byKickoff), last: toColumn(last, (a, b) => Match.byKickoff(b, a)) });
}

// Agenda: la prossima partita di ogni preferito, chieste insieme (tetto e cache dell'API fanno da freno), unite per id
// (due preferiti che giocano tra loro) e in ordine di data; le squadre che non arrivano diventano l'avviso
async function loadAgenda() {
  const teams = state.favorites.list;
  const signal = restart('agenda');
  if (!teams.length) return setState('agenda', null);
  if (state.agenda?.status !== 'ok') setState('agenda', { status: 'loading' });
  const settled = await Promise.allSettled(teams.map((team) => api.getNextMatches(team.id, { signal })));
  if (signal.aborted) return;
  const matches = new Map(settled.flatMap((result) => result.value ?? []).map((match) => [match.id, match]));
  const error = settled.find((result) => result.status === 'rejected')?.reason ?? null;
  if (!matches.size && error) return setState('agenda', { status: 'error', error });
  setState('agenda', { status: 'ok', matches: [...matches.values()].sort(Match.byKickoff), error });
}

// Aggiungi ai preferiti: elenchi ridisegnati, focus sul pulsante (ora «Già nei preferiti»), annuncio, agenda aggiornata
function addFavorite(team) {
  if (!state.favorites.add(team)) return;
  renderTeams();
  focusFavoriteButton(elements.results.list, team.id);
  announce(`${team.name} aggiunta ai preferiti`);
  loadAgenda();
}

// Togli dai preferiti: il pulsante cliccato sparisce, quindi il focus va sul titolo dei preferiti
function removeFavorite(team) {
  if (!state.favorites.remove(team.id)) return;
  renderTeams();
  elements.favorites.title.focus();
  announce(`${team.name} tolta dai preferiti`);
  loadAgenda();
}

// Azioni sulle card (data-action), e squadre e partite già caricate cercate per id
const TEAM_ACTIONS = { open: openTeam, add: addFavorite, remove: removeFavorite };
const findTeam = (id) => state.favorites.get(id) ?? state.search.teams?.find((team) => team.id === id);
const findMatch = (id) => [state.detail?.next, state.detail?.last, state.agenda]
  .flatMap((column) => column?.matches ?? []).find((match) => match.id === id);

// Clic delegato sulle card: la squadra da data-team-id, l'azione da data-action
function handleTeamClick(event) {
  const button = event.target.closest('[data-action]');
  const team = findTeam(button?.closest('[data-team-id]')?.dataset.teamId);
  if (!team) return;
  console.log('[card] clic:', button.dataset.action, team.name);
  TEAM_ACTIONS[button.dataset.action]?.(team);
}

// Ricerca: subito con «Cerca» o Invio, oppure 400 ms dopo l'ultimo tasto; il campo vuoto riporta il messaggio iniziale;
// il minimo di lettere sta solo nell'HTML (minlength)
function initSearch() {
  let debounceTimer = null;
  const readQuery = () => elements.searchInput.value.trim().replace(/\s+/g, ' ');
  const longEnough = (query) => query.length >= elements.searchInput.minLength;
  elements.searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = readQuery();
    if (!query) {
      aborts.search?.abort();
      return setState('search', { status: 'idle' });
    }
    if (longEnough(query)) debounceTimer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
  });
  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(debounceTimer);
    const query = readQuery();
    console.log('[ricerca] invio:', query);
    if (longEnough(query)) runSearch(query);
  });
}

// Filtro per sport, senza richieste; il valore iniziale si legge dal form perché il browser può ricordarlo
function initSportFilter() {
  const readSport = () => elements.sportFilter.elements.sport.value;
  state.sport = readSport();
  elements.sportFilter.addEventListener('change', () => {
    state.sport = readSport();
    console.log('[filtro] sport:', state.sport || 'tutti');
    renderTeams();
  });
}

// Preferiti: le card salvate subito all'avvio; clic su «Rimuovi» e sul nome
function initFavorites() {
  renderFavorites(elements.favorites, state.favorites.list, teamFilters.isVisible);
  elements.favorites.list.addEventListener('click', handleTeamClick);
}

// Squadre trovate: messaggio iniziale; clic su «Aggiungi» e sul nome
function initResults() {
  RENDER.search(state.search);
  elements.results.list.addEventListener('click', handleTeamClick);
}

// Modale: la apre Bootstrap dal pulsante della voce (data-bs-toggle); qui si riempie con la partita già caricata
function initMatchModal() {
  elements.modal.root.addEventListener('show.bs.modal', (event) => {
    const match = findMatch(event.relatedTarget?.dataset.matchId);
    if (!match) return event.preventDefault();
    console.log('[modale] apro:', match.name);
    fillMatchModal(elements.modal, match);
  });
}

// Avvio, nell'ordine della pagina; l'agenda si carica subito dai preferiti salvati
console.log('[avvio] SportsHub');
initSearch();
initSportFilter();
initFavorites();
loadAgenda();
initResults();
initMatchModal();
