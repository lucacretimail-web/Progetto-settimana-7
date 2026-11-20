// Squadre (Vista): le card dei preferiti e dei risultati, filtrate per sport; legge solo i getter di Team,
// la vista non importa il modello
import { cloneTemplate, fillFields, setBadge, showLoading, showMessage, showError } from './comune.js';

const cardTemplate = document.getElementById('team-card-template');

// Pulsante dei preferiti nelle tre versioni del riferimento; il testo nascosto aggiunge la squadra al nome accessibile,
// che comincia con il testo visibile (WCAG 2.5.3); «saved» non ha azione
const FAVORITE_BUTTONS = {
  add: { favoriteIcon: '☆', favoriteLabel: 'Aggiungi ai preferiti', suffix: (name) => `: ${name}`, action: 'add' },
  saved: { favoriteIcon: '✓', favoriteLabel: 'Già nei preferiti', suffix: (name) => `: ${name}`, action: null },
  remove: { favoriteIcon: '🗑', favoriteLabel: 'Rimuovi', suffix: (name) => ` ${name} dai preferiti`, action: 'remove' },
};

// Testi senza card: nessun preferito salvato, o nessuna card dello sport scelto nel filtro
const EMPTY_TEXTS = {
  favorites: 'Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.',
  favoritesFiltered: 'Nessuna squadra preferita per questo sport.',
  resultsFiltered: 'La squadra trovata è di un altro sport: scegli «Tutti» nel filtro.',
};

// Riga sopra le card: quante sono e, siccome la chiave gratuita ne dà una sola, come trovare quella giusta
const foundText = (count) => `${count} ${count === 1 ? 'squadra trovata' : 'squadre trovate'}. `
  + 'L\'API gratuita ne mostra una per ricerca: se non è quella giusta, scrivi il nome completo.';

// Stato della sezione risultati, per stato della ricerca
const RESULT_STATUS = {
  idle: (status) => showMessage(status, 'Inizia cercando una squadra qui sopra.'),
  loading: (status, { query }) => showLoading(status, `Cerco «${query}»…`),
  error: (status, { error }) => showError(status, error),
  ok: (status, { query, teams }) => showMessage(status, teams.length ? foundText(teams.length) : `Nessuna squadra trovata per «${query}».`),
};

// Card: data-team-id dice al controller la squadra, data-action cosa farne
function createTeamCard(team, buttonKind) {
  const item = cloneTemplate(cardTemplate);
  const button = item.querySelector('.team-card__favorite');
  const look = FAVORITE_BUTTONS[buttonKind];
  item.querySelector('.team-card').dataset.teamId = team.id;
  fillFields(item, { name: team.name, league: team.league, country: team.country, ...look, favoriteSuffix: look.suffix(team.name) });
  setBadge(item.querySelector('.team-card__badge'), team.badge, team.name);
  button.classList.add(`team-card__favorite--${buttonKind}`);
  if (look.action) button.dataset.action = look.action;
  else button.setAttribute('aria-disabled', 'true');
  return item;
}

// Preferiti: le card dello sport scelto con «Rimuovi», oppure il messaggio giusto se non ce ne sono
export function renderFavorites({ status, list }, teams, isVisible) {
  const visible = teams.filter(isVisible);
  if (visible.length) status.replaceChildren();
  else showMessage(status, teams.length ? EMPTY_TEXTS.favoritesFiltered : EMPTY_TEXTS.favorites);
  list.replaceChildren(...visible.map((team) => createTeamCard(team, 'remove')));
}

// Risultati: lo stato sopra, le card dello sport scelto sotto; isFavorite sceglie «Aggiungi» o «Già nei preferiti»
export function renderResults({ status, list }, search, { isVisible, isFavorite }) {
  const teams = search.status === 'ok' ? search.teams : [];
  const visible = teams.filter(isVisible);
  if (teams.length && !visible.length) showMessage(status, EMPTY_TEXTS.resultsFiltered);
  else RESULT_STATUS[search.status](status, search);
  list.replaceChildren(...visible.map((team) => createTeamCard(team, isFavorite(team) ? 'saved' : 'add')));
}

// Focus sul pulsante dei preferiti di una squadra dopo un ridisegno (l'id ha solo cifre: sicuro nel selettore)
export const focusFavoriteButton = (list, teamId) => list.querySelector(`[data-team-id="${teamId}"] .team-card__favorite`)?.focus();
