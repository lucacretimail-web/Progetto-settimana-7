// Partita (Modello, OOP): Match è la partita da giocare, PlayedMatch la estende con il punteggio (unica sottoclasse).
// La vista le tratta allo stesso modo: score vale null finché la partita non è giocata (polimorfismo)
import { readId, readText, readHttpsUrl } from './campi.js';

// Fuso orario in fondo a una data ISO: «Z» oppure «+00:00»
const TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

// Inizio e ora nota: strTimestamp è UTC senza la Z (senza, in Italia l'ora sbaglierebbe); poi data e ora separate;
// con la sola data, mezzogiorno UTC, così il giorno resta lo stesso in ogni fuso
function readKickoff(raw) {
  const timestamp = readText(raw?.strTimestamp);
  const date = readText(raw?.dateEvent);
  const time = readText(raw?.strTime);
  const candidates = [
    { value: timestamp && (TIME_ZONE_SUFFIX.test(timestamp) ? timestamp : `${timestamp}Z`), hasTime: true },
    { value: date && time && `${date}T${time}Z`, hasTime: true },
    { value: date && `${date}T12:00:00Z`, hasTime: false },
  ];
  for (const { value, hasTime } of candidates) {
    const kickoff = value ? new Date(value) : null;
    if (kickoff && !Number.isNaN(kickoff.getTime())) return { kickoff, hasTime };
  }
  return null;
}

// Punteggio: l'API lo manda come stringa ("3") o null; vale solo un intero da 0 in su
function readScore(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

export class Match {
  #id;
  #homeTeam;
  #awayTeam;
  #kickoff;
  #hasTime;
  #league;
  #season;
  #venue;
  #status;
  #homeBadge;
  #awayBadge;

  // Riceve un oggetto con i nomi dei campi; lo chiamano solo fromApi e la sottoclasse
  constructor({ id, homeTeam, awayTeam, kickoff, hasTime, league, season, venue, status, homeBadge, awayBadge }) {
    this.#id = id;
    this.#homeTeam = homeTeam;
    this.#awayTeam = awayTeam;
    this.#kickoff = kickoff;
    this.#hasTime = hasTime;
    this.#league = league;
    this.#season = season;
    this.#venue = venue;
    this.#status = status;
    this.#homeBadge = homeBadge;
    this.#awayBadge = awayBadge;
  }

  // Dalla risposta dell'API: la classe la sceglie il punteggio; null se mancano id, squadre o una data valida
  static fromApi(raw) {
    const id = readId(raw?.idEvent);
    const homeTeam = readText(raw?.strHomeTeam);
    const awayTeam = readText(raw?.strAwayTeam);
    const when = readKickoff(raw);
    if (!id || !homeTeam || !awayTeam || !when) {
      console.warn('[modello] partita scartata, mancano id, squadre o data:', raw?.idEvent, raw?.strEvent);
      return null;
    }
    const fields = {
      id,
      homeTeam,
      awayTeam,
      ...when,
      league: readText(raw.strLeague),
      season: readText(raw.strSeason),
      venue: readText(raw.strVenue),
      status: readText(raw.strStatus),
      homeBadge: readHttpsUrl(raw.strHomeTeamBadge),
      awayBadge: readHttpsUrl(raw.strAwayTeamBadge),
    };
    const home = readScore(raw.intHomeScore);
    const away = readScore(raw.intAwayScore);
    return home === null || away === null ? new Match(fields) : new PlayedMatch(fields, { home, away });
  }

  // Ordine per data, dalla più vicina; al contrario: (a, b) => Match.byKickoff(b, a)
  static byKickoff(a, b) { return a.#kickoff - b.#kickoff; }

  // Getter in sola lettura: name si ricava dalle squadre, kickoff è una copia (da fuori non si cambia),
  // hasTime è false quando l'API dà solo il giorno, status è il codice dell'API (NS, FT…)
  get id() { return this.#id; }
  get homeTeam() { return this.#homeTeam; }
  get awayTeam() { return this.#awayTeam; }
  get name() { return `${this.#homeTeam} vs ${this.#awayTeam}`; }
  get kickoff() { return new Date(this.#kickoff); }
  get hasTime() { return this.#hasTime; }
  get league() { return this.#league; }
  get season() { return this.#season; }
  get venue() { return this.#venue; }
  get status() { return this.#status; }
  get homeBadge() { return this.#homeBadge; }
  get awayBadge() { return this.#awayBadge; }
  get score() { return null; }
}

// Partita giocata: una Match più il punteggio, che sovrascrive score; il trattino di «3 – 1» lo mette la vista
class PlayedMatch extends Match {
  #homeScore;
  #awayScore;

  constructor(fields, { home, away }) {
    super(fields);
    this.#homeScore = home;
    this.#awayScore = away;
  }

  get score() { return { home: this.#homeScore, away: this.#awayScore }; }
}
