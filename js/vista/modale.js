// Modale (Vista): la partita aperta dall'agenda o dal pannello, con i dati già caricati; il contenuto nasce dal template
// a ogni apertura, perché gli stemmi mancanti diventano un segnaposto e una parte fissa non si potrebbe riusare
import { cloneTemplate, fillFields, setBadge } from './comune.js';
import { DATE_FORMAT, formatScore } from './partite.js';

const contentTemplate = document.getElementById('match-modal-template');
// Ora hh:mm nel fuso di chi guarda
const TIME_FORMAT = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
// Stato della partita: i codici di TheSportsDB in italiano; un codice sconosciuto si mostra com'è
const STATUS_LABELS = new Map([['NS', 'Non iniziata'], ['FT', 'Finita'], ['Match Finished', 'Finita'], ['AET', 'Finita ai supplementari'],
  ['PEN', 'Finita ai rigori'], ['PST', 'Rinviata'], ['CANC', 'Annullata']]);

// Data e ora: l'ora solo se l'API la dà (hasTime), altrimenti se ne mostrerebbe una inventata
const formatKickoff = ({ kickoff, hasTime }) => DATE_FORMAT.format(kickoff) + (hasTime ? `, ore ${TIME_FORMAT.format(kickoff)}` : '');

// Modale: titolo «Casa vs Trasferta», squadre con lo stemma, punteggio oppure «vs», dati in righe (quelle vuote si tolgono)
export function fillMatchModal({ title, body }, match) {
  const content = cloneTemplate(contentTemplate);
  const { homeTeam, awayTeam, league, season, venue, status, score } = match;
  fillFields(content, {
    homeTeam, awayTeam, league, season, venue,
    score: score && formatScore(score), kickoff: formatKickoff(match), status: STATUS_LABELS.get(status) ?? status,
  });
  setBadge(content.querySelector('[data-badge=home]'), match.homeBadge, homeTeam);
  setBadge(content.querySelector('[data-badge=away]'), match.awayBadge, awayTeam);
  content.querySelector(score ? '.match-modal__versus' : '.match-modal__score').remove();
  for (const value of content.querySelectorAll('.match-modal__fact dd')) {
    if (!value.textContent) value.parentElement.remove();
  }
  title.textContent = match.name;
  body.replaceChildren(content);
}
