// Partite (Vista): l'agenda dei preferiti e il pannello della squadra; legge solo i getter di Match (score è null per le
// partite da giocare, e il badge si toglie); le partite arrivano già in ordine dal controller
import { cloneTemplate, fillFields, showLoading, showMessage, showError } from './comune.js';

const matchTemplate = document.getElementById('match-template');
// Data gg/mm/aaaa nel fuso di chi guarda e punteggio «3 – 1» col trattino medio, come nel riferimento (li usa anche la modale)
export const DATE_FORMAT = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const formatScore = ({ home, away }) => `${home} – ${away}`;

// Testi delle colonne del pannello e dell'agenda: mentre si caricano e quando sono vuote
const COLUMN_TEXTS = {
  next: { loading: 'Carico i prossimi eventi…', empty: 'Nessun evento in programma' },
  last: { loading: 'Carico gli ultimi risultati…', empty: 'Nessun risultato recente' },
};
const AGENDA_TEXTS = { loading: 'Carico i prossimi appuntamenti…', empty: 'Nessun appuntamento in programma per le tue squadre.' };

// Stato di una colonna: spinner, errore, messaggio se è vuota, niente se ci sono partite
const COLUMN_STATUS = {
  loading: (status, column, texts) => showLoading(status, texts.loading),
  error: (status, column) => showError(status, column.error),
  ok: (status, column, texts) => (column.matches.length ? status.replaceChildren() : showMessage(status, texts.empty)),
};

// Voce partita: data, «Casa vs Trasferta» e punteggio (senza badge se non è giocata); data-match-id dice cosa aprire nella modale
function createMatchItem(match) {
  const item = cloneTemplate(matchTemplate);
  const { kickoff, score } = match;
  item.querySelector('.match__open').dataset.matchId = match.id;
  fillFields(item, { date: DATE_FORMAT.format(kickoff), name: match.name, score: score && formatScore(score) });
  item.querySelector('.match__date').dateTime = kickoff.toISOString();
  if (!score) item.querySelector('.match__score').remove();
  return item;
}

// Colonna: lo stato sopra, le partite sotto quando sono arrivate
function renderColumn({ status, list }, column, texts) {
  COLUMN_STATUS[column.status](status, column, texts);
  const matches = column.status === 'ok' ? column.matches : [];
  list.replaceChildren(...matches.map((match) => createMatchItem(match)));
}

// Agenda: nascosta senza preferiti (null); se alcune squadre non si sono caricate, sopra le partite arrivate c'è l'avviso
export function renderAgenda({ section, status, list }, agenda) {
  section.hidden = !agenda;
  if (!agenda) return;
  renderColumn({ status, list }, agenda, AGENDA_TEXTS);
  if (agenda.error) showError(status, agenda.error);
}

// Pannello: titolo con il nome della squadra e le due colonne, ognuna con il suo stato
export function renderDetail(elements, detail) {
  elements.section.hidden = false;
  elements.title.textContent = detail.team.name;
  for (const key of Object.keys(COLUMN_TEXTS)) renderColumn(elements[key], detail[key], COLUMN_TEXTS[key]);
}
